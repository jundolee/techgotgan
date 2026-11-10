# 기획자·개발자 진입 페이지 홍보 문안

## 대상과 목적

- **기획자:** 제품 문제와 관련된 기술 선택·운영 사례를 찾을 때 기업 기술 블로그의 원문을 비교해 읽는다.
- **개발자:** 구현 중 비슷한 기술 선택을 조사하고, 필요하면 MCP 호환 AI 코딩 도구에서 최신 공개 글을 찾는다.
- **목적:** 게시물 반응 자체보다 랜딩 방문 후 검색, 서비스 안의 글 열기, 원문 이동을 확인한다.
- **공통 랜딩:** `/for-product-teams`
- **기획자 읽기 가이드:** `/guides/product-search-for-planners` (네이버 D2 원문, 검토 질문, 검색 CTA)
- **기획자 캠페인:** `product_manager_research_techgotgan_2026q4`
- **개발자 MCP 캠페인:** `techgotgan_agent_search_2026q4`

## 기획자용 게시 초안

**제목:** 추천·검색 기능을 기획할 때, 실제 기술 사례는 어디서 찾으세요?

**본문:** 기능 목록만으로는 구현 뒤의 운영 방식이나 기술 선택 배경까지 파악하기 어렵습니다. 테크곳간에서 여러 회사 기술 블로그를 추천·검색·결제 같은 주제로 찾아보고, 각 회사가 공개한 원문을 확인할 수 있습니다. 기획 검토나 기술 협의 전에 참고할 사례를 찾고 싶다면 ‘추천’ 검색 결과부터 살펴보세요. 검색과 원문 읽기는 가입 없이 이용할 수 있습니다.

**링크:** `https://www.techgotgan.co.kr/for-product-teams?utm_source=disquiet&utm_medium=maker_post&utm_campaign=product_manager_research_techgotgan_2026q4`

이 문안은 디스콰이엇 메이커 포스트 형식을 우선 후보로 작성했다. 제품 등록·게시 전에는 해당 계정의 현재 게시 조건과 접근 권한을 확인한다.

## 개인 블로그 기획자 대상 게시

- **공개 글:** [만들고 나면 사람들이 찾아올 줄 알았다 — 테크곳간 첫 유입 만들기](https://jundolee.github.io/posts/2026-11-06-%EA%B2%80%EC%83%89-%EA%B8%B0%EB%8A%A5%EC%9D%84-%EA%B8%B0%ED%9A%8D%ED%95%A0-%EB%95%8C-%EA%B8%B0%EC%88%A0-%EB%B8%94%EB%A1%9C%EA%B7%B8%EC%97%90%EC%84%9C-%ED%99%95%EC%9D%B8%ED%95%A0-%EB%8B%A4%EC%84%AF-%EA%B0%80%EC%A7%80/)
- **대상:** 비개발자 PM과 제품 실무자. 네이버 플레이스 검색 사례를 다섯 가지 제품 질문으로 정리하고, 기획자용 가이드로 연결한다.
- **CTA 캠페인:** `maker_ep04_product_research_2026q4` (`utm_source=jundolee_blog`, `utm_medium=article`)
- **GA4 확인(2026-11-06~11-10):** 캠페인에 일치하는 행이 없었고, QA 제외 세션·활성 사용자·가이드 랜딩은 모두 0으로 관측됐다. 이는 GA4에서 귀속된 방문이 없다는 뜻이며, 개인 블로그 노출이나 링크 클릭 수는 별도로 확인하지 않았다.
- **다음 판단:** 같은 기획자 가이드를 독립 글로 다시 게시하지 않는다. 새로운 문제 해결 사례 모음 페이지(`/cases`)에서 이 가이드를 후속 탐색 경로로 제공한다.

## 개발자용 MCP 소개 문안

**제목:** AI 코딩 도구에서 한국 기업 기술 블로그 검색하기

**본문:** 코드 작업 중 회사의 공개 기술 사례가 필요할 때, MCP 호환 AI 코딩 도구에 테크곳간 검색 서버를 연결할 수 있습니다. 공개 RSS 최신 글의 제목과 발췌문을 검색하고 발행처·원문 링크를 돌려줍니다. 전문을 가져오지 않고, 검색 기록도 서버에 저장하지 않습니다. 연결 방법과 도구 설정은 저장소 안내에서 확인할 수 있습니다.

**도구 안내:** `https://github.com/jundolee/techgotgan/blob/main/tools/techgotgan-mcp/README.ko.md`

**서비스 링크 예시:** `https://www.techgotgan.co.kr/?q=Next.js&utm_source=ai_agent&utm_medium=mcp&utm_campaign=techgotgan_agent_search_2026q4`

이 링크는 실사용자에게 배포하기 전 실제 MCP 클라이언트에 연결해 initialize → tool list → 검색 → 원문 이동 흐름을 확인한다. CLI의 직접 프로토콜 호출은 유입 성과로 계산하지 않는다.

## 판정 기준

캠페인별로 외부 게시 노출·클릭, 랜딩 고유 사용자, `audience_landing_action`, `article_search_completed`, `article_click`, `source_article_click`, 공유 유입, 7일 재방문을 분리한다. `audience_landing_action`은 `home_entry`, `blog_directory_entry`, `explore_menu_entry`, `topic_hub_landing`, `planner_guide`, `planner_landing`, `planner_search`, `developer_topic`, `mcp_setup` 중 선택한 행동만 기록하며 검색어·기사 제목은 전송하지 않는다. 읽기 가이드의 원문 이동은 `source_article_click`의 `editorial_guide` surface로 분리한다. 캠페인별 랜딩 사용자가 30명 미만이면 성공·실패를 판정하지 않고 표본 부족으로 기록한다. 유입이 검색으로 이어지지 않으면 대상 메시지를, 검색이 원문 이동으로 이어지지 않으면 결과의 관련성과 원문 안내를 먼저 검토한다.

**상태:** 문안과 측정 링크 준비. MCP Registry 공개 조회는 아직 등록되지 않은 상태(HTTP 404)지만, 공식 검증 API에서 현재 서버 메타데이터가 `valid: true`로 확인됐다. `websiteUrl`은 한국어 랜딩을 가리킨다. GitHub OAuth와 공개 등록, 제3자 계정 게시물은 진행하지 않았다.
