# 테크곳간 유입 증가 계획

## 목표와 범위

한국어 채널을 이용하는 **회사 엔지니어링 사례를 찾는 국내 소프트웨어 개발자**를 우선 타겟으로 둔다. 첫 하위 집단은 토스 프론트엔드 지원·조사를 준비하는 개발자이고, 다음은 특정 주제의 구현 사례를 찾는 개발자다. 한국 거주 여부를 분석 이벤트로 추정하지 않고, 한국어 콘텐츠·채널별 캠페인으로 타겟한다.

성공은 랜딩이나 회원가입 제출만으로 세지 않는다. GA4와 Amplitude의 `authenticated_session_started`는 서버가 로그인된 Supabase 사용자를 확인한 세션에서만 발생하도록 하고, 이 이벤트의 고유 사용자와 UTM/source·medium을 실제 로그인 전환으로 비교한다. Amplitude `auth_page_viewed`와 `auth_attempt_started`는 전환 과정의 이탈 위치를 찾는 보조 지표다.

현재 14일 캠페인은 2026-10-29 03:26 UTC에 Velog 후속 글을 공개하면서 시작했다. [실험 로그와 측정 정의](career-guide-experiment.md)를 기준으로 2026-11-12 03:26 UTC까지 관찰한다.

## 현재 기준선에서 읽히는 점

2026-10-01~10-28 GA4 사전 데이터:

- 사이트 전체 활성 사용자 162명, 신규 사용자 159명이다. 이 값은 이번 캠페인 랜딩의 값이 아니다.
- `career_guide_toss_frontend`는 `velog / article`에서 3세션·3명, 참여율 100%, 평균 참여 시간 18초였다. 규모는 작지만 확인된 채널 중 가장 높은 의도 신호다. 유입은 [기존 Velog 글](https://velog.io/@xukitsuki/%ED%86%A0%EC%8A%A4-%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C-%EC%A7%80%EC%9B%90-%EC%A0%84-%EC%9D%BD%EC%96%B4%EB%B3%BC-%EA%B8%B0%EC%88%A0-%EA%B8%80-3%ED%8E%B8)에 달린 UTM 링크에서 왔다.
- `okky / community`는 36세션이었지만, 공개 운영정책에 외부 링크·상업적 게시물 제한이 있어 허가 없이 재게시하지 않는다.
- `github / discussion`은 4세션, 참여 세션 0건이었다. 저장소 페이지 Traffic API는 10월 14~27일과 재확인한 10월 21일~11월 3일 모두 조회 0회·순방문 0명이었고 인기 referrer/path도 없었다. 저장소 페이지 조회는 사이트 방문이나 README 링크 클릭과 다른 지표다.
- 저장소 [Discussion #58](https://github.com/jundolee/techgotgan/discussions/58)은 10월 26일 “기술 블로그 글 찾다가 탭만 열 개 열린 적 있나요?”라는 질문형 게시물로 공개했고, 큐레이션 UTM 링크(`github_discussion_2026w44`)를 포함한다. 11월 4일 확인 기준 upvote 1개·댓글 0개였다. 반응 수는 사이트 방문이나 UTM 클릭 수로 보지 않는다.
- Search Console에서 가이드는 색인됐지만 10월 20~26일 정확한 URL의 노출·클릭은 0회였다. 사이트 전체는 클릭 1회·노출 66회였다. SEO는 필요하지만 2주 안에 유입을 보장하는 채널로 보지 않는다.

### 채널 비교와 현재 판정

수치는 대부분 2026-10-01~28의 GA4 사전 기간이다. 랜딩 범위와 표본이 서로 달라 채널별 전환율을 직접 비교할 수는 없지만, 다음 실험의 우선순위를 정하는 기준으로 사용한다.

| 유입 경로 | 확인된 규모 | 이용 의도 신호 | 판정 |
|---|---:|---|---|
| Velog → 토스 가이드 | 3세션·3명 | 참여율 100%, 평균 참여 18초 | 현재 가장 강한 의도 신호지만 표본이 작다. 전용 UTM 실험을 끝까지 관찰한다. |
| OKKY | 36세션 | 같은 랜딩의 참여·원문 클릭 자료는 미확인 | 사전 기간의 최대 세션 경로지만 홍보 게시 허가가 확인되지 않아 재게시하지 않는다. |
| Google 자연 검색 | 23세션(사이트 전체) | Search Console 10/20~26 도메인 전체 1클릭·66노출, 가이드 URL 0클릭·0노출 | 검색 기반은 필요하지만 단기 유입을 기대하지 않는다. |
| GitHub Discussion | GA4 사전 기간 4세션; Discussion #58 반응 1표·댓글 0; 저장소 API 최근 14일 0조회·0순방문(10/21~11/3) | GA4 참여 세션 0; Discussion UTM 캠페인 행은 아직 분리 확인하지 못함 | 저장소 트래픽·반응 수를 사이트 방문으로 오인하지 않고 현재 우선순위를 낮춘다. |

2026-11-05 GA4 보고서에서 2026-10-08~11-04를 확인했다. 전체 사이트는 활성 사용자 219명, 신규 사용자 216명, 세션 424건, 참여 세션 214건(참여율 50.47%)이었다. `South Korea`는 활성 사용자 95명(43.38%), 신규 사용자 92명, 참여 세션 202건(전체 참여 세션의 94.39%), 참여율 67.56%였다. 미국은 활성 사용자 63명이지만 참여 세션 3건(1.40%)에 그쳤고, 프랑스·네덜란드 등에서도 참여가 거의 없어 비한국 트래픽에는 자동화·데이터센터 유입이 섞였을 가능성이 높다. 국가 값은 IP 기반 위치이며 한국 사용자 신원 판정이나 실제 로그인 수가 아니다.

한국 국가 필터를 적용한 세션 소스/매체 보고서는 299세션을 보여줬다. `google / organic`은 50세션, 참여율 74%; `okky / community`는 36세션, 참여율 52.78%; `jundolee_blog / article`은 7세션, 참여율 85.71%; `velog / article`은 3세션, 참여율 100%였다. 후자의 두 채널은 표본이 너무 작아 우열을 말할 수 없다. `accounts.google.com / referral`도 78세션(한국 세션의 26.09%), 참여 세션 63건, 평균 참여 2분 44초로 크게 잡혔다. 2026-11-05 Google 태그 설정에서 `accounts.google.com`이 원치 않는 추천 도메인으로 이미 등록되어 있음을 확인했다. 규칙의 시작일은 확인하지 못했고 GA4 보고 기간은 10/08~11/04이므로 78세션을 현재 설정의 실패나 실제 획득 채널로 단정하지 않는다. 이후 로그인 세션에서 보고되는 source/medium을 다시 확인한다. `experiment_qa / qa` 15세션, `localhost:3147 / referral` 6세션, `qa / browser` 4세션, `internalqa / screenshot` 2세션 등 테스트 출처도 별도로 분리한다.

같은 기간 GA4 이벤트 보고서에는 이벤트 이름이 9개(`page_view`, `user_engagement`, `article_click`, `session_start`, `scroll`, `first_visit`, `click`, `form_start`, `view_search_results`)였고 `login`, `sign_up`, 인증 완료 이벤트는 없었다. South Korea 필터가 적용된 페이지 보고서에서 `/login`은 49조회·15활성 사용자·평균 참여 1분 55초였다. 같은 국가 필터와 `/login` 경로 조건으로 본 트래픽 획득 보고서는 34세션, 참여 세션 34건, 평균 참여 50초였다. 소스/매체는 `(direct) / (none)` 15세션(평균 1분 42초), `accounts.google.com / referral` 12세션(12초), `google / organic` 2세션(9초)이었다. 이 값은 로그인 경로 진입과 반복 세션을 보여줄 뿐 인증 성공을 증명하지 않는다. 특히 Google 리퍼럴 세션은 로그인 왕복 또는 재방문일 수 있으므로 인증 완료 이벤트와 대조해야 한다. Amplitude 가이드 리포트(10/29~11/12)에서도 `/careers/toss-frontend` `page_viewed` 고유 사용자와 `career_guide_interaction` 고유 사용자가 0명이었다. 이는 해당 도구에서 관측된 신호일 뿐 실제 방문이 전혀 없었다는 확정값은 아니다.

2026-11-05 PR #195 (`660f5ee0f779ec213072620d0065fd71e39560db`)를 Production에 배포했다. 서버가 로그인된 Supabase 사용자를 확인한 뒤 `authenticated_session_started`와 인증 방식만 `dataLayer`에 보내고, Amplitude에도 동일 전환 이벤트를 보낸다. GTM 컨테이너 `GTM-P2HHB9CG` 버전 6에 GA4 이벤트 태그·맞춤 이벤트 트리거·`auth_method` 변수를 게시했고, GA4의 같은 이벤트를 주요 이벤트로 등록했다. Production의 비로그인 페이지에서 GTM 컨테이너 로드와 가입 화면은 확인했으며 이 세션에서는 인증 이벤트가 발생하지 않았다. GA4 주요 이벤트에도 이벤트가 아직 수신되지 않았다고 표시된다. 따라서 한국 유입과 로그인 화면 방문은 확인됐지만 실제 로그인 전환은 아직 증명되지 않았다. 이후 실제 사용자의 로그인을 기다리고 source/medium별 인증 완료 사용자 수를 확인한다.

2026-11-06 후속 전환 개선에서는 로그인으로 이어지는 행동 이유를 함께 측정한다. 즐겨찾기 저장은 `favorite_save`, 읽음 기록 저장은 `reading_progress`로 나누고, 해당 이유를 `/login?intent=signup`에 전달해 로그인 화면의 안내와 Google 버튼 문구를 행동에 맞춘다. Amplitude `auth_page_viewed`·`auth_attempt_started`에 이 범주만 넣어 어떤 행동이 가입 시도를 만드는지 확인한다. GA4·Amplitude `authenticated_session_started`만 실제 로그인 전환으로 센다. 글 ID, 제목, 이메일, 계정 ID는 보내지 않는다.

## 채널 우선순위와 실행

| 우선순위 | 채널 | 근거 | 실행 상태 |
|---|---|---|---|
| 1 | Velog | 유일하게 확인된 `career_guide_toss_frontend`의 3세션이 모두 참여 세션이었다. | 새 글을 게시하고 기존 글에서 후속 글로 교차 링크했다. 전용 캠페인 `career_guide_toss_frontend_velog_2026q4`로 추적한다. |
| 2 | 회사·주제 허브의 검색 유입 | 페이지는 색인됐지만 실험 전 노출은 0이었다. 검색 의도에 맞는 제목·요약·내부 링크가 필요하다. | 이번 관찰 중에는 랜딩을 바꾸지 않는다. Search Console은 주 1회 확인하고, 다음 단계에서 노출이 확인된 쿼리에 맞춰 허브를 보강한다. |
| 3 | 개발자 커뮤니티 | OKKY는 사전 세션 36건으로 규모가 컸다. | 게시 규칙과 허가를 먼저 확인한다. 허가 없이 링크를 올리지 않는다. 허용되면 단순 링크가 아니라 문제와 읽기 질문을 담은 글 하나만 게시한다. |
| 4 | GitHub | 사전 `github / discussion` 4세션은 참여가 없었고 저장소 페이지 조회도 0이었다. | README 링크는 유지하되 단기 유입 채널로 의존하지 않는다. 이후 유입이 생길 때 다시 평가한다. |
| 무료 제품 소개 | GeekNews Show | [시작 안내](https://news.hada.io/start)는 직접 만든 서비스를 Show에 소개할 수 있다고 안내한다. [이용약관](https://news.hada.io/terms)은 반복적인 트래픽 유도·홍보성 등록을 제한한다. | Show용 초안을 아래에 준비했다. 현재 브라우저는 로그아웃 상태라 계정 요건을 확인할 수 없어 제출하지 않았다. 반복 게시·추천 요청 없이 한 번만 소개한다. |
| 유료 보조안 | GeekNews 스폰서 | 공식 [스폰서 안내](https://news.hada.io/sponsor)는 광고 위치별 일정·견적을 문의로 안내한다. | 비구속 견적 문의를 2026-10-29 03:37 UTC에 보냈다. 견적 확인 후 예산 승인 전에는 예약·결제하지 않는다. |

Velog 공개 글은 기술 선택을 면접 답변으로 정리하는 6문장 틀을 제공한다. 가이드 CTA는 세 원문을 모아보는 추가 자료로 둔다. 외부 계정에 올리는 글은 커뮤니티별 규칙을 확인하고 동일 문구를 여러 곳에 반복하지 않는다.

## 14일 실행 일정

### 게시 직후

- Velog 글과 기존 글의 교차 링크가 공개 상태인지 확인한다.
- `velog / article` 및 전용 캠페인 UTM이 GA4에 들어오는지 본다. `experiment_qa` 방문과 운영자 검수는 제외한다.
- Amplitude에서는 랜딩 고유 방문자, 원문 이동, 피드백, 공유 완료를 본다. `page_viewed`와 후속 이벤트에 안전한 UTM source/medium/campaign 및 외부 유입 도메인을 붙여 채널별로 비교한다. GA4 source/medium과 대조하고, `article_click`(서비스 내 미리보기 열기)과 `source_article_click`(외부 원문 이동)을 구분한다.

### 48시간 점검

- 전용 캠페인의 세션·신규 사용자·참여 세션·가이드 랜딩을 기존 캠페인 기준선과 비교한다.
- UTM이 없거나 직접 유입으로만 잡히면 채널 성과로 오인하지 말고 귀속 문제를 먼저 확인한다.

### 8일차 중간 점검

- 유입량과 원문 클릭이 적으면 랜딩 자체를 바로 바꾸기보다 게시물 노출·클릭과 UTM 유입을 나눠 본다.
- Velog에 반응이 있고 실제 원문 이동도 있으면 같은 독자군의 후속 콘텐츠 주제 하나를 정한다.
- 커뮤니티 확장이 필요하면 허용 여부를 확인한 뒤 한 곳에서만 시험한다.

### 14일차 최종 평가

- 테스트 방문을 뺀 고유 랜딩 방문자, 채널별 세션, 신규 사용자, 원문 클릭, 피드백, 공유 유입을 정리한다.
- 고유 방문자 30명 미만이면 PMF나 채널 실패로 결론내리지 않고 **표본 부족**으로 기록한다.
- 충분한 방문이 있고 원문 클릭이 발생한 채널만 다음 2주 동안 반복한다. 유입은 있으나 클릭이 없으면 메시지/랜딩 연결을 수정한다.

## 30일 이후 지속 성장

1. Velog에서 격주로 검색·면접 준비에 도움이 되는 독립적인 기술 글을 발행하고, 각 글의 UTM 캠페인을 다르게 둔다.
2. Search Console에서 실제 노출 쿼리를 확인해 주제 허브와 기업별 허브에 연결한다. 얇은 키워드 페이지만 늘리지 않는다.
3. 첫 독자군 실험을 마친 뒤 메이커 독자군을 별도 검증한다. 디스콰이엇은 직접 만든 IT 제품 등록과 제품에 연결된 메이커 포스트를 중심으로 개편됐으므로, 테크곳간 제품 페이지 등록과 사용 피드백 요청을 한 번 시험할 후보로 둔다([현재 플랫폼 안내](https://diqua.io/announcement)). 첫 독자군 캠페인과 같은 게시물·UTM으로 합치지 않는다.
4. 재방문이 확인되면 이메일 요약은 명시적 구독 동의를 받는 방식으로 검토한다.
5. 유입 수보다 신규 사용자가 검색 후 원문을 열고 다시 방문하는 비율을 우선 지표로 삼는다.

### 기획자·개발자 대상별 진입 페이지

- **페이지:** `/for-product-teams`. 기획자에게는 추천·검색·결제 같은 제품 문제 검색과 실제 ‘추천’ 검색 결과를 보여주고, 개발자에게는 주제 허브와 MCP 연결 안내를 제공한다. 검색과 원문 열람은 가입 없이 가능하다는 점을 명시한다.
- **기획자 실험:** 제품 문제를 다루는 개별 자료와 AI/ML·Backend 주제 허브에서 이 페이지로 연결한다. 외부 캠페인은 `utm_campaign=product_manager_research_techgotgan_2026q4`를 사용하고, 허브 내부 이동은 `audience_landing_action: topic_hub_landing`으로 분리한다. 이후 `page_viewed` → `audience_landing_action: planner_search` → `article_search_completed` → `source_article_click` → 7일 재방문 순서로 본다.
- **기획자 콘텐츠 경로:** 2026-10-08~11-04 한국 GA4 보고서에서 `jundolee_blog / article`은 7세션·85.71% 참여율을 보였다. 표본은 작고 어느 원문·랜딩에서 발생했는지 확인되지 않아 성과 확정이 아니라 조사 대상이다. 검색 시스템 사례를 제품 기획 질문으로 연결하는 자체 사이트 가이드 `/guides/product-search-for-planners`를 추가하고, 개인 블로그 4편은 이 가이드로 연결하는 초안을 [`기획자용 개인 블로그 문안`](product-teams-promotion-copy.md)으로 준비했다. 게시 시 `maker_ep04_product_research_2026q4` 캠페인으로 기존 1~3편과 나눠 유입과 검색·원문 이동을 비교한다.
- **읽기 가이드 행동:** `/guides/product-search-for-planners`의 원문 이동은 `source_article_click`의 `editorial_guide`, 검색 CTA는 `audience_landing_action: planner_search`, 랜딩으로 돌아가는 링크는 `planner_landing`으로 분리한다. 공유 이벤트는 `content_guide` surface를 쓴다.
- **개발자 실험:** 기존 MCP와 별도 UTM `techgotgan_agent_search_2026q4`를 유지한다. 실제 코딩 에이전트 설정 문서나 호출만 세지 않고 랜딩 `page_viewed` → `audience_landing_action: developer_topic|mcp_setup` → 검색·원문 이동·재방문을 성과로 본다.
- **내부 진입 경로 측정:** 홈, 블로그 목록, 둘러보기 메뉴, AI/ML·백엔드 허브에서 랜딩을 선택한 행동은 각각 `home_entry`, `blog_directory_entry`, `explore_menu_entry`, `topic_hub_landing`으로 나눈다. 기획자 읽기 가이드는 `planner_guide` 진입 행동으로 구분한다. UTM 유입과 섞지 않아 외부 도달과 기존 방문자의 랜딩 발견을 따로 본다.
- **판정:** 두 대상의 캠페인과 랜딩 행동을 섞지 않는다. 각 대상의 방문자가 30명 미만이면 채널 성공·실패를 판정하지 않는다. 페이지 방문은 있으나 검색이 없으면 대상 메시지를, 검색은 있으나 원문 이동이 없으면 검색 결과와 원문 안내를 먼저 검토한다.
- **2026-11-05 구현 확인:** `/for-product-teams` 랜딩, 홈·둘러보기·블로그 목록·README의 진입 링크, 공유 이벤트 분류, sitemap 항목을 추가했다. `npm run build`, TypeScript 검사, 변경 파일 ESLint가 통과했고 로컬 SSR은 HTTP 200 및 canonical·기획자/개발자 문구·검색/주제 링크를 반환했다. 로컬 환경에는 Supabase 자격 증명이 없어 추천 검색 결과 샘플은 대체 문구로 표시됐다.
- **2026-11-05 Production 확인:** PR #190 (`2459d1375733853b8a5bb1e0849a68af7a216cb6`)을 09:33 UTC에 병합했다. Vercel Production 배포 `7570051388`은 09:33:57 UTC에 `success`가 됐다. 09:38 UTC 확인에서 랜딩, 홈, 블로그 목록, sitemap 모두 HTTP 200이었고 랜딩 canonical, 기획자·개발자 섹션, 실제 추천 결과 2건, sitemap 경로를 확인했다. 추천·검색·결제 검색 URL과 프론트엔드·백엔드·AI/ML 주제 허브도 각각 HTTP 200과 글 결과를 반환했다.
- **유입 판정:** 페이지와 분석 경로가 공개됐지만 이 요청에 의한 Production 응답 확인은 실제 사용자 방문이 아니다. 외부 게시물은 아직 공개하지 않았으며 세션·원문 이동 성과는 계속 측정해야 한다.
- **현 상태:** 공개 랜딩과 GitHub README 진입 링크가 활성화됐다. 대상 경로 클릭은 `audience_landing_action`으로 익명 측정하며 검색어와 기사 제목은 보내지 않는다. 다음 단계는 기획자용 Maker 포스트 한 건을 배포하고 UTM·검색·원문 이동을 관찰하는 것이다.

### 디스콰이엇 제품 페이지와 Maker 포스트

- **대상:** 새 기술 자료를 찾거나 직접 만든 제품의 개발 사례를 공유하는 메이커.
- **가설:** 기업 기술 블로그를 탐색하고 원문을 모아 읽는 작업이 제품을 만드는 사람의 반복적인 조사 흐름에 도움이 된다.
- **플랫폼 조건 확인(2026-11-05):** 현재 안내는 메이커가 자기 제품을 등록하고, 메인 피드 노출을 위해 제품에 연결된 포스트를 작성하는 구조다. 제품 링크만 있는 포스트는 피드에 노출되지 않을 수 있다([공식 리뉴얼 안내](https://diqua.io/announcement)).
- **제품명:** 테크곳간
- **한 줄 소개:** 여러 회사의 기술 블로그 글을 주제와 발행처별로 찾아보고 원문까지 이어 읽는 공개 피드.
- **기존 제품 페이지:** `https://disquiet.io/products/3a38bc03-d2f0-4250-a056-46f004e042e2`. 2026-11-05 확인에서 소개 문안은 기능과 맞고, 아직 연결된 포스트가 없었다. 제품을 새로 중복 등록하지 않는다.
- **기존 방문 링크:** 기존 공개 페이지는 `utm_source=disquiet&utm_medium=product_listing&utm_campaign=disquiet_product_2026w44`를 사용했다. 2026-11-05 기존 제품 설정에서 방문 링크를 `https://www.techgotgan.co.kr/?utm_source=disquiet&utm_medium=product&utm_campaign=techgotgan_disquiet_2026q4`로 바꾸는 수정안을 제출했다. 플랫폼 검토 전까지 공개 페이지의 방문 버튼은 이전 UTM을 유지한다.
- **Maker 포스트 제목:** 회사 기술 사례를 찾을 때 블로그 탭을 계속 늘리지 않으려고 만들었습니다.
- **게시 내용:** 제품을 만들다 보면 특정 기술 선택의 배경이 궁금해 여러 회사의 기술 블로그를 찾아보게 됩니다. 글을 놓치거나 어디서 봤는지 다시 찾기 어려워 공개 글을 주제와 발행처별로 모아보는 테크곳간을 만들었습니다. `/topics/frontend`에서 최신 글을 살펴보고, 글 상세에서 발행처 원문으로 이어 읽어보세요. 둘러보기와 원문 읽기는 가입 없이 이용할 수 있습니다. 읽음 표시와 즐겨찾기를 계정에 저장하고 다른 기기에서도 이어서 보려면 무료 회원가입으로 기록을 남길 수 있어요. 어떤 회사 블로그나 주제가 빠졌는지, 원문까지 탐색하는 흐름이 어땠는지 피드백을 받고 싶습니다.
- **게시된 포스트:** [회사 기술 사례를 찾을 때 블로그 탭을 계속 늘리지 않으려고 만들었습니다](https://disquiet.io/posts/BgC2zp). 기존 테크곳간 제품에 연결했다.
- **주제 허브 링크:** `https://www.techgotgan.co.kr/topics/frontend?utm_source=disquiet&utm_medium=maker_post&utm_campaign=techgotgan_disquiet_2026q4`
- **가입 CTA:** `https://www.techgotgan.co.kr/login?intent=signup&utm_source=disquiet&utm_medium=maker_post_signup&utm_campaign=techgotgan_disquiet_2026q4`
- **상태(2026-11-05):** 승인된 Maker 포스트를 공개했고 공개 URL과 두 UTM 링크가 HTTP 200을 반환했다. 제품 방문 URL 수정은 플랫폼 관리자 검토 대기 중이다. 게시 공개 자체는 방문·가입·로그인 전환 증거가 아니므로 GA4와 Amplitude의 인증 완료 이벤트를 따로 확인한다.
- **판정:** UTM 세션, `article_search_completed`, `source_article_click`, 공유, 7일 재방문을 따로 본다. 30명 미만이면 성공/실패를 단정하지 않고 표본 부족으로 둔다.

### 주제·블로그 허브 공유 루프 (2026-11-04 준비)

- **가설:** 검색이나 직접 방문으로 특정 주제/발행처 허브를 찾은 사람이 그 허브 자체를 동료에게 공유하면, 단일 기사 링크보다 이후 탐색에 다시 쓸 수 있는 진입점을 전달한다.
- **표면:** `/topics`, `/topics/[category]`, `/blogs`, `/blogs/[slug]`에 공유 동작을 둔다. 빈 주제/발행처 허브에는 공유를 보이지 않는다.
- **추적:** `share_action_completed`의 `share_surface`와 서로 다른 UTM 캠페인(`topic_directory_share_2026q4`, `topic_hub_share_2026q4`, `blog_directory_share_2026q4`, `blog_hub_share_2026q4`)을 사용한다. 수신자의 실제 랜딩, `source_article_click`, 7일 재방문을 비교한다.
- **판정:** 공유 완료 이벤트만으로 바이럴이라고 보지 않는다. 공유 유입 세션과 실제 원문 이동이 있어야 가치 신호로 본다. 표본이 30명 미만이면 판단을 유보한다.

### AI 코딩 에이전트 안에서 기술 글 찾기

- **방향:** 검색 결과를 사람이 커뮤니티에서 발견할 때까지 기다리는 대신, 개발자가 코드 작업 중 쓰는 AI 에이전트가 한국 기업의 공개 기술 글을 찾아 출처와 함께 돌려준다.
- **가설:** 에이전트가 기술 질문에 맞는 실제 회사 사례를 제시하고, Techgotgan의 검색 링크로 관련 글을 더 보여주면 새로운 진입 경로가 생긴다.
- **초기 범위:** 읽기 전용 MCP 도구 하나로 공개 RSS 최신 200개 제목·발췌문만 검색한다. 원문과 UTM이 붙은 테크곳간 검색 링크를 같이 반환한다. 전문을 가져오거나 요약을 생성하지 않는다.
- **측정:** `utm_source=ai_agent&utm_medium=mcp` 랜딩, 이후 원문 클릭, 7일 재방문을 본다. 도구 호출 수는 별도로 수집하지 않으므로 사이트 유입으로 이어진 경우만 성과로 센다.
- **주의:** 제목과 발췌문은 외부 글에서 온 비신뢰 데이터로 취급한다. 전문·개인 데이터·검색어 로그는 서버에 저장하지 않는다.
- **2026-11-05 Production 동작 확인:** `https://www.techgotgan.co.kr/api/mcp`에서 MCP `initialize`, `tools/list`, `search_korean_engineering_blogs` 호출을 각각 HTTP 200으로 확인했다. 실제 검색 호출은 RSS 최신 200개를 읽고 검색 링크에 `utm_source=ai_agent`, `utm_medium=mcp`, 캠페인 UTM을 반환했다. 이는 프로토콜·검색 경로의 직접 확인이지 외부 클라이언트 사용이나 유입 증거는 아니다. 다음 단계는 실제 개발자 에이전트 환경에서 연결 방법을 안내하고, 해당 UTM 랜딩·원문 이동·7일 재방문을 확인하는 것이다.
- **2026-11-05 MCP Registry 상태 확인:** 공식 Registry API에서 `io.github.jundolee/techgotgan-search` 조회는 404(미등록)를 반환했다. 공개 원격 전용 서버도 패키지 없이 등록할 수 있으며 `io.github` 등록에는 GitHub OAuth가 필요하다([공식 등록 안내](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx)). `mcp/server.json`의 `websiteUrl`을 한국어 랜딩으로 맞추고 공개 검증 API에서 `valid: true`, `issues: []`를 확인했지만 OAuth나 공개 등록은 진행하지 않았다.

## 운영 규칙

- 보고 확인 주기: GA4·Amplitude 48시간마다, Search Console 주 1회. 사용자가 요청한 간격보다 자주 상태 메시지를 보내지 않는다.
- 외부 게시: 공개 대상과 사용자의 계정으로 게시하기 전에 플랫폼 규정과 게시 권한을 확인한다.
- 실험 중간에 랜딩·UTM을 바꾸면 바꾼 시각을 로그에 남기고 전후 데이터를 구분한다.

## OKKY 채널 진입 준비

사전 데이터에서 OKKY 유입이 36세션으로 확인됐지만, [OKKY 운영정책](https://okky.kr/policies/operation-policy)이 승인되지 않은 외부 플랫폼 연결과 상업적 게시물을 제한한다. 게시 허용 여부를 묻는 문의를 2026-10-29 03:35 UTC에 `info@okky.kr`로 보냈다. 답변을 받기 전에는 게시하지 않는다.

**수신:** `info@okky.kr`  
**제목:** 개발자 기술 글 읽기 자료의 커뮤니티 공유 가능 여부 문의

> 안녕하세요. 토스의 공개 기술 글을 읽을 때 참고할 질문과, 읽은 내용을 본인 프로젝트 사례로 정리하는 방법을 모은 무료 안내 자료를 운영하고 있습니다. OKKY에서 이런 교육용 자료와 링크를 공유해도 되는지, 허용되는 게시판과 표기 기준이 있는지 문의드립니다. 커뮤니티의 규정에 맞지 않으면 게시하지 않겠습니다.

허용 답변을 받으면 커뮤니티용 UTM은 `utm_source=okky&utm_medium=community&utm_campaign=career_guide_toss_frontend_okky_2026q4`로 분리하고, Velog 캠페인과 별도로 측정한다.

## GeekNews Show 초안

**제목:** Show: 회사 기술 블로그를 주제별로 찾아 읽는 테크곳간

**본문:** 여러 회사의 기술 블로그 글을 한곳에서 제목·요약·태그로 검색하고, 주제와 발행처별로 살펴볼 수 있는 공개 서비스입니다. 새 글을 놓치지 않도록 RSS와 주간 모아보기도 제공합니다. 현재 모든 방문자는 같은 큐레이션 피드를 보며, 개인별 소스 구독은 제공하지 않습니다. 개발자들이 회사 기술 사례를 찾을 때 어떤 탐색 흐름이 가장 유용한지 의견을 듣고 싶습니다.

**링크:** `https://www.techgotgan.co.kr/?utm_source=geeknews&utm_medium=show&utm_campaign=techgotgan_show_2026q4`

아직 게시하지 않았다. GeekNews 계정 로그인과 제출 가능 여부를 확인한 뒤, Show 한 건으로만 검토한다.

## 유료 채널 준비

GeekNews는 스폰서 광고 위치와 견적을 문의해 안내하는 방식이며, 실제 집행은 결제와 소재 확정 후 진행된다. 비구속 견적 문의는 2026-10-29 03:37 UTC에 보냈다. 견적과 집행 조건을 검토하고 예산 승인을 받기 전에는 예약·결제하지 않는다.

**배너 초안(미집행)**

- 제목: 토스 프론트엔드 지원 전, 공개 기술 글 3편으로 내 경험을 정리해보세요
- 설명: 팀의 협업 방식과 기술 선택 이유를 원문·읽기 질문으로 살펴보는 독립 가이드입니다. 공식 채용 안내나 예상 면접 문항은 아닙니다.
- CTA: 읽기 가이드 보기
- 추적 URL: `https://www.techgotgan.co.kr/careers/toss-frontend?utm_source=geeknews&utm_medium=sponsor&utm_campaign=career_guide_toss_frontend_sponsor_2026q4`
