import type { Metadata } from "next";
import Link from "next/link";
import { ArticleLink } from "@/components/article-link";
import { CaseProblemSelector } from "@/components/case-problem-selector";
import { CasePromptShareButton } from "@/components/case-prompt-share-button";
import { PageHeader } from "@/components/page-header";
import { ShareButton } from "@/components/share-button";
import { SITE_NAME, SITE_URL } from "@/app/seo";
import styles from "./page.module.css";

const canonical = `${SITE_URL}/cases`;
const title = "기업은 문제를 어떻게 해결했을까? | 테크곳간 사례 모음";
const description = "기업 기술 블로그에서 문제와 해결 과정, 공개된 결과가 분명한 사례를 골라 짧게 소개합니다. 자세한 조건은 각 회사의 원문에서 확인하세요.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description,
    url: canonical,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
  },
  twitter: { card: "summary", title: `${title} | ${SITE_NAME}`, description },
};

type CaseStory = {
  source: string;
  category: string;
  title: string;
  anchor: string;
  href: string;
  problem: string;
  change: string;
  outcome: string;
  outcomeNote: string;
  linkLabel: string;
  discussionQuestion: string;
  shareCampaign: string;
  articleId?: string;
  sourceUrl?: string;
};

const cases: CaseStory[] = [
  {
    source: "뱅크샐러드",
    category: "반복 업무",
    title: "망분리 환경에서도 한 달 만에 AX로 생산성을 높인 방법",
    anchor: "banksalad-case",
    articleId: "43c7f621-aabc-4a62-a321-f986464e544a",
    href: "/articles/43c7f621-aabc-4a62-a321-f986464e544a",
    sourceUrl: "https://corp.banksalad.com/blog/tech/banksalad-ax-workflow-automation/",
    problem: "망분리 환경에서 팀의 반복 업무를 줄여야 했습니다.",
    change: "두 팀에 업무 자동화를 적용했습니다.",
    outcome: "담당자 한 명당 매일 30분~1시간 절약",
    outcomeNote: "한 달 뒤, 원문 작성팀이 공개한 결과",
    linkLabel: "기사 요약과 원문 보기",
    discussionQuestion: "우리 팀에서 매일 반복하는 일 가운데 한 달 안에 자동화해볼 수 있는 것은 무엇일까요?",
    shareCampaign: "problem_case_prompt_banksalad_2026w46",
  },
  {
    source: "컬리",
    category: "테스트 품질",
    title: "코드에서 화면 지도를 그리고, AI와 함께 회귀 테스트의 빈 곳을 채우다",
    anchor: "kurly-case",
    articleId: "d142232d-1703-4984-8296-4de5f2fe7586",
    href: "/articles/d142232d-1703-4984-8296-4de5f2fe7586",
    sourceUrl: "https://helloworld.kurly.com/blog/web-e2e-coverage-map/",
    problem: "467개 화면의 테스트 빈틈을 다시 살펴봤습니다.",
    change: "화면을 지도처럼 정리하고 테스트를 보완했습니다.",
    outcome: "5일 동안 테스트 114개 추가",
    outcomeNote: "컬리 기술 블로그가 공개한 작업 기록",
    linkLabel: "기사 요약과 원문 보기",
    discussionQuestion: "우리 서비스의 핵심 화면 중 변경 뒤 확인할 테스트가 빠진 곳은 어디일까요?",
    shareCampaign: "problem_case_prompt_kurly_2026w46",
  },
  {
    source: "네이버 D2",
    category: "검색 경험",
    title: "네이버 플레이스의 호텔 검색",
    anchor: "naver-case",
    href: "/guides/product-search-for-planners",
    problem: "정확한 이름만 찾는 검색은 오탈자와 정보 누락에 취약했습니다.",
    change: "다국어 검색어와 장소 매칭, 키워드·스니펫 추출을 다뤘습니다.",
    outcome: "검색 커버리지 약 3% 증가",
    outcomeNote: "네이버 D2 작성팀이 해당 프로젝트에서 보고한 결과",
    linkLabel: "사례와 기획 질문 보기",
    discussionQuestion: "사용자가 오탈자나 별칭으로 검색해도 원하는 대상을 찾을 수 있을까요?",
    shareCampaign: "problem_case_prompt_naver_2026w46",
  },
];

export default function CasesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: cases.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title,
        url: `${SITE_URL}${item.href}`,
      })),
    },
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PageHeader navHref="/" navLabel="전체 글" exploreMenu />

      <header className={styles.hero}>
        <div className={styles.heroHeading}>
          <div>
            <p className={styles.eyebrow}>문제 · 해결 · 결과</p>
            <h1>회사는 어떤 문제를 어떻게 해결했을까요?</h1>
          </div>
          <ShareButton
            title={title}
            url={canonical}
            size="small"
            variant="neutralWeak"
            shareSurface="case_collection"
            shareCampaign="problem_solution_case_collection_2026w46"
          />
        </div>
        <p className={styles.lead}>기업 기술 블로그에서 실제 문제와 바꾼 점, 공개된 결과가 분명한 사례를 골랐습니다. 먼저 짧게 훑고, 더 궁금한 내용은 요약과 원문에서 확인하세요.</p>
        <p className={styles.note}>시간과 효과는 원문 작성팀이 공개한 내용입니다. 다른 서비스에 그대로 적용되는 목표치로 해석하지 않습니다.</p>
      </header>

      <section className={styles.problemPicker} aria-labelledby="problem-picker-title">
        <h2 id="problem-picker-title">지금 어떤 문제와 가까운가요?</h2>
        <CaseProblemSelector className={styles.problemOptions} />
      </section>

      <ol className={styles.caseList}>
        {cases.map((item, index) => (
          <li
            className={styles.caseCard}
            id={item.anchor}
            key={item.href}
          >
            <div className={styles.caseTopline}>
              <span className={styles.caseNumber}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.caseCategory}>{item.category}</span>
              <span className={styles.publisher}>{item.source}</span>
            </div>
            <h2>{item.title}</h2>
            <dl className={styles.caseSteps}>
              <div>
                <dt>문제</dt>
                <dd>{item.problem}</dd>
              </div>
              <div>
                <dt>바꾼 점</dt>
                <dd>{item.change}</dd>
              </div>
              <div className={styles.result}>
                <dt>결과</dt>
                <dd>{item.outcome}</dd>
                <small>{item.outcomeNote}</small>
              </div>
            </dl>
            <div className={styles.teamPrompt}>
              <p>팀에서 이어갈 질문</p>
              <blockquote>{item.discussionQuestion}</blockquote>
              <CasePromptShareButton
                title={item.title}
                prompt={item.discussionQuestion}
                href={item.href}
                campaign={item.shareCampaign}
                className={styles.promptShare}
              />
            </div>
            {item.articleId && item.sourceUrl ? (
              <ArticleLink
                articleId={item.articleId}
                articleTitle={item.title}
                href={`/articles/${encodeURIComponent(item.articleId)}`}
                sourceUrl={item.sourceUrl}
                className={styles.caseLink}
              >
                {item.linkLabel} <span aria-hidden="true">→</span>
              </ArticleLink>
            ) : (
              <Link className={styles.caseLink} href={item.href}>
                {item.linkLabel} <span aria-hidden="true">→</span>
              </Link>
            )}
          </li>
        ))}
      </ol>

      <section className={styles.more} aria-labelledby="more-cases">
        <div>
          <p className={styles.eyebrow}>다음 탐색</p>
          <h2 id="more-cases">다른 문제와 기술 주제로도 이어서 찾아보세요</h2>
          <p>블로그별·기술별 글을 검색해 비슷한 사례와 원문을 더 읽을 수 있습니다.</p>
        </div>
        <Link className={styles.moreLink} href="/blogs">
          기업 기술 블로그 둘러보기 <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
}
