# 앱인토스 미니앱과 무료 백엔드

테크곳간은 앱인토스 WebView에서 최신 글을 읽고, 전체 아카이브를 검색하고, 공개 요약을 확인한 뒤 원문으로 이동해요. 앱 화면은 `apps/in-toss/`에서 별도 번들로 만들어요.

운영 Vercel 프로젝트가 `DEPLOYMENT_DISABLED` 상태여서 앱 API를 기존 Supabase 프로젝트의 Edge Function으로 분리해요. 자동 글 수집은 공개 GitHub 저장소의 Actions에서 기존 Node.js 수집 코드를 실행해요. 이 구성은 새 유료 호스팅 계정을 추가하지 않아요.

## 앱에서 할 수 있는 일

- 최신 기술 블로그 글과 주제별 탐색
- 회사별 블로그 디렉터리와 회사별 글 목록
- 주간 큐레이션 아카이브와 주간별 글·분포
- 제목·요약·태그를 대상으로 전체 아카이브 검색
- 공개 AI 요약과 원문 발행처 이동
- 관심 글 저장과 읽음 표시

저장한 글과 읽음 표시는 앱인토스 WebView에 보관해요. 웹사이트 로그인 계정이나 다른 기기와는 동기화하지 않아요. 회사 목록과 주간 큐레이션은 앱 안의 Supabase Edge API에서 열어요.

## 필요한 접근 권한과 값

- 앱인토스 콘솔에 등록한 미니앱의 `appName`
- 기존 Supabase 프로젝트에 Edge Function을 배포할 권한
- 공개 GitHub 저장소 `jundolee/techgotgan`의 Actions 설정 권한
- 앱인토스 CLI 토큰은 로컬 사용자 설정에 등록해요. 저장소나 채팅에 붙여넣지 마세요.

`apps/in-toss/apps-in-toss.config.ts`의 `appName`은 앱인토스 콘솔의 고유 식별자와 같아야 해요. 현재 기본값은 `techgotgan`이에요. 콘솔에 등록한 값이 다르면 설정 파일과 Supabase Function secret `APP_IN_TOSS_APP_NAME`을 함께 맞춰주세요.

콘솔 아이콘은 [600×600 정사각형 로고](../apps/in-toss/console-icon.svg)를 사용해요. SDK 3.x는 브랜드 아이콘을 설정 파일에 넣지 않고 콘솔에서 등록해요.

## Supabase Edge Function 배포

`supabase/functions/techgotgan-intoss-api/`는 공개 글 API예요. Supabase 플랫폼이 `SUPABASE_SECRET_KEYS`를 함수에 주입하고, 함수는 `default` secret key를 `apikey` 헤더로만 보내 서버에서 DB를 읽어요. 옛 프로젝트의 `SUPABASE_SERVICE_ROLE_KEY` JWT도 fallback으로 지원해요. publishable key만 앱 번들에 포함해요.

```bash
npx supabase link --project-ref <project-ref>
npx supabase functions deploy techgotgan-intoss-api
npx supabase secrets set APP_IN_TOSS_APP_NAME=techgotgan
```

`supabase/config.toml`에서 함수의 JWT 검증은 꺼져 있어요. 함수는 읽기 전용 공개 글 API만 제공해요. CORS에서 앱인토스 운영·테스트 origin과 로컬 개발 origin만 허용해요. CORS는 인증 수단이 아니므로 함수에 사용자별 데이터나 쓰기 작업을 추가하지 마세요.

## 무료 글 수집 일정

`.github/workflows/techgotgan-maintenance.yml`은 현재 Node 수집 코드를 사용해요. 16개 shard를 첫 수집과 재시도로 나누고, 첫 수집은 shard 사이 3분, 재시도는 1분 간격을 둬 외부 블로그 요청이 몰리지 않게 해요. `vercel.json`의 cron은 제거했어요.

GitHub 저장소 Settings → Secrets and variables → Actions에 아래 값을 등록해요.

- Repository variable `NEXT_PUBLIC_SUPABASE_URL`
- Repository secret `SUPABASE_SECRET_KEY` (`sb_secret_...`, Node 수집·worker용)
- Repository variable `RSS_PROXY_URL` and secret `RSS_PROXY_TOKEN` for the authenticated Cloudflare RSS proxy used by scheduled ingestion.
- AI 요약을 켤 때만 Secret `OPENAI_API_KEY`와 Variable `OPENAI_SUMMARY_ENABLED=true`
- 벡터 추천을 켤 때만 Secret `PINECONE_API_KEY`, `PINECONE_INDEX_HOST`와 Variable `ENABLE_EMBEDDING_JOBS=true`

수집에는 `OPENAI_API_KEY`를 전달하지 않아 글 분류는 규칙 기반으로 처리하고 유료 AI 분류 호출을 만들지 않아요. 요약을 켜면 수집기는 비밀값 없이 새 글을 대기열에 넣고, 최근 24시간 안에 발견된 글의 누락된 요약 작업만 재시도 때 복구해요. 오래된 피드 글은 자동으로 대기열에 넣지 않아요. 요약 worker만 `OPENAI_SUMMARY_ENABLED=true`와 OpenAI 키를 받아 처리해요. 임베딩 worker는 `ENABLE_EMBEDDING_JOBS=true`일 때만 Pinecone 키를 받아요. Free 사용량을 넘긴 Storage `thumbnails` 버킷에 새 이미지를 추가하지 않도록 GitHub 수집에서는 `MIRROR_THUMBNAILS_ENABLED=false`로 실행해요. 요약과 임베딩은 기본적으로 꺼져 있고, 비밀값은 설치 단계가 아닌 필요한 작업에만 전달해요. 수집 workflow를 수동 실행한 뒤 Supabase `sources.last_success_at`·`last_error`와 `articles.discovered_at`을 확인하고, 예약 실행도 확인해요.

Supabase Storage에서 `articles.thumbnail_url`이 참조하지 않는 썸네일 파일 214개(약 0.143 GB)를 확인했어요. 먼저 `cleanup-thumbnails-audit`를 실행해 개수·크기와 객체 지문을 확인하고, 그 지문을 GitHub Actions 변수에 고정한 다음 `cleanup-thumbnails`를 실행해요. 삭제 작업은 참조 목록과 전체 버킷 인벤토리를 바로 다시 읽고, 지문이 하나라도 바뀌면 중단한 뒤 Storage API로 승인된 객체만 지워요. Storage 요금은 GB-Hours 기준이라 월간 사용량 표시가 삭제 직후 바로 내려가지 않을 수 있어요.

기존 Vercel cron의 IndexNow 제출은 공개 사이트가 복구될 때까지 중지해요. 복구 후 GitHub Actions에 `INDEXNOW_ENABLED=true`, `INDEXNOW_API_URL=https://<public-host>/api/cron/indexnow`, `CRON_SECRET`을 설정하면 매일 다시 실행돼요. 현재 웹사이트 API는 HTTP 402 `DEPLOYMENT_DISABLED`를 반환해 제출을 켜지 않았어요.

## 무료 플랜 한도와 중지 위험

Supabase Free에는 Edge Function 500,000회/월과 egress 5GB가 포함돼요. Edge Function은 요청마다 CPU 2초, Free 플랜에서 wall time 150초까지 쓸 수 있어요. 무료 프로젝트는 DB 활동이 적으면 7일 뒤 일시 중지될 수 있으므로, 매일 수집 workflow와 Supabase 사용량을 확인해야 해요. [Supabase 요금](https://supabase.com/pricing), [Edge Function 한도](https://supabase.com/docs/guides/functions/limits), [무료 프로젝트 일시 중지 정책](https://supabase.com/docs/guides/platform/free-project-pausing)를 참고하세요.

저장소가 공개되어 있어 GitHub-hosted 표준 runner 사용에 요금을 내지 않아요. [GitHub Actions 요금 기준](https://docs.github.com/en/actions/concepts/billing-and-usage). 예약 실행은 GitHub에 workflow가 올라간 뒤 동작하고, 일정이 지연될 수 있어요. 공개 저장소에서 60일 동안 활동이 없으면 GitHub가 예약 workflow를 비활성화할 수 있어 주기적으로 Actions 상태를 확인해야 해요. [예약 workflow 자동 중지 정책](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows).

Netlify Free는 월 300 크레딧 한도를 넘으면 사이트를 멈추고, Cloudflare Workers Free는 요청당 CPU 10ms 제한이 있어요. Cloudflare의 Next.js 16용 vinext는 아직 Beta이고, 저장소 검사에서는 API 호환성이 97%로 나왔어요. 이 조건들을 감안해 기존 데이터베이스에 가까운 Supabase Edge Function을 앱 API로 택했어요. [Netlify Free 한도](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/), [Cloudflare Workers Free 한도](https://developers.cloudflare.com/workers/platform/pricing/), [Cloudflare Next.js 가이드](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/).

## 로컬 실행과 앱 번들

터미널 두 개에서 실행해요.

```bash
npm run dev
npm run intoss:dev
```

`apps/in-toss/.env.local`에 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`를 설정하면 앱이 Edge Function을 사용해요. 공개 키로 새 `sb_publishable_...` 형식이나 기존 프로젝트의 `anon` JWT만 허용해요. `sb_secret_...` 또는 `service_role` 키는 공개 `.ait` 번들에 포함되지 않도록 빌드가 거부해요. 로컬 Next API로 테스트하려면 `VITE_TECHGOTGAN_API_URL=http://localhost:3000`으로 덮어써요.

`.ait`를 만들려면 HTTPS API URL과 Supabase publishable key가 필요해요.

```bash
npm run intoss:build
```

토큰을 `npx ait token add`로 로컬 CLI에 등록한 뒤 테스트 번들을 올려요.

```bash
npm run intoss:deploy
```

테스트 스킴이나 콘솔 QR 코드로 토스 앱에서 API 연결과 화면을 확인한 뒤, 콘솔에서 출시 심사를 요청해요. 앱인토스 공식 흐름은 [기존 WebView 연동](https://developers-apps-in-toss.toss.im/ai-vibe-coding/tutorials/webview.md), [SDK 3.x 안내](https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x.md), [토스 앱 테스트 가이드](https://developers-apps-in-toss.toss.im/guide/operation/toss.md)에 설명돼 있어요.

## API 계약

- `GET /functions/v1/techgotgan-intoss-api/feed`: 최신 공개 글 100편
- `GET /functions/v1/techgotgan-intoss-api/feed?source={id}`: 선택한 회사의 최신 공개 글 50편
- `GET /functions/v1/techgotgan-intoss-api/publishers`: 활성 회사 블로그 목록
- `GET /functions/v1/techgotgan-intoss-api/digest/weeks`: 최근 12주 아카이브
- `GET /functions/v1/techgotgan-intoss-api/digest/{week}`: 주간 글과 주제·회사 분포
- `POST /functions/v1/techgotgan-intoss-api/search`: 전체 아카이브 검색. 검색어는 2~80자
- `GET /functions/v1/techgotgan-intoss-api/articles/{id}`: 공개 글과 준비된 요약

현재 Supabase project ref와 publishable key, 서비스 함수 권한, 앱인토스 콘솔 등록값은 이 작업 환경에서 확인하지 못했어요. 그래서 운영용 `.ait` 생성, Supabase 배포, 콘솔 업로드와 QR 테스트는 아직 남아 있어요. 기존 Vercel 웹사이트는 별도로 중지 상태이며, 새 웹 호스트와 sitemap이 정상 응답하기 전까지 IndexNow도 중지해요.
