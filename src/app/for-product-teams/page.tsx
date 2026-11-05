import type { Metadata } from "next";
import { connection } from "next/server";
import { ArticleLink } from "@/components/article-link";
import { AudienceLandingActionLink } from "@/components/audience-landing-action-link";
import { PageHeader } from "@/components/page-header";
import { ShareButton } from "@/components/share-button";
import { searchArticles } from "@/lib/data/articles";
import { SITE_NAME, SITE_URL } from "@/app/seo";
import styles from "./page.module.css";

export const runtime = "nodejs";
export const fetchCache = "default-cache";

const canonical = `${SITE_URL}/for-product-teams`;
const title = "기획자·개발자를 위한 기술 블로그 검색";
const description = "한국 기업 기술 블로그의 사례를 주제와 발행처별로 찾고, 기획과 개발에 필요한 원문까지 이어 읽어보세요.";
const shareImage = `${canonical}/opengraph-image`;

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
    images: [{ url: shareImage, width: 1200, height: 630, alt: title }],
  },
  twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description, images: [shareImage] },
};

export default async function ProductTeamsPage() {
  await connection();
  const recommendationArticles = await searchArticles("추천", null)
    .then((articles) => articles.slice(0, 3))
    .catch(() => []);

  return (
    <main className={styles.main}>
      <PageHeader navHref="/" navLabel="전체 글" />

      <header className={styles.hero}>
        <div className={styles.heroHeading}>
          <div>
            <p className={styles.kicker}>기획자와 개발자를 위한 공개 기술 사례 검색</p>
            <h1>제품을 기획하고 구현할 때, 회사의 실제 기술 사례를 찾아보세요</h1>
          </div>
          <ShareButton
            title={title}
            url={canonical}
            size="small"
            variant="neutralWeak"
            shareSurface="audience_landing"
            shareCampaign="product_teams_landing_share_2026q4"
          />
        </div>
        <p className={styles.lead}>
          여러 기업 기술 블로그의 글을 주제와 발행처별로 검색하고, 가입 없이 원문까지 이어 읽을 수 있습니다.
        </p>
        <div className={styles.heroActions}>
          <AudienceLandingActionLink className={styles.primaryAction} href="/?q=%EC%B6%94%EC%B2%9C" action="planner_search">추천 사례 검색</AudienceLandingActionLink>
          <AudienceLandingActionLink className={styles.secondaryAction} href="/topics" action="developer_topic">개발 주제별 글 보기</AudienceLandingActionLink>
        </div>
      </header>

      <section className={styles.section} aria-labelledby="product-research">
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>기획자 · 제품 조사</p>
          <h2 id="product-research">제품 문제와 가까운 사례를 검색하세요</h2>
          <p>추천, 검색, 결제처럼 제품에서 다루는 주제를 검색해 기업이 공개한 구현·운영 경험을 살펴볼 수 있습니다.</p>
        </div>
        <nav className={styles.queryLinks} aria-label="제품 사례 검색">
          <AudienceLandingActionLink href="/?q=%EC%B6%94%EC%B2%9C" action="planner_search">추천 사례 검색 <span aria-hidden="true">→</span></AudienceLandingActionLink>
          <AudienceLandingActionLink href="/?q=%EA%B2%80%EC%83%89" action="planner_search">검색 사례 검색 <span aria-hidden="true">→</span></AudienceLandingActionLink>
          <AudienceLandingActionLink href="/?q=%EA%B2%B0%EC%A0%9C" action="planner_search">결제 사례 검색 <span aria-hidden="true">→</span></AudienceLandingActionLink>
        </nav>
        <AudienceLandingActionLink href="/guides/product-search-for-planners" action="planner_guide" className={styles.guideLink}>
          기획자용 검색 사례 읽기 가이드 보기 →
        </AudienceLandingActionLink>
        <div className={styles.results}>
          <h3>‘추천’ 검색 결과</h3>
          {recommendationArticles.length > 0 ? (
            <ul>
              {recommendationArticles.map((article) => (
                <li key={article.id}>
                  <ArticleLink
                    articleId={article.id}
                    articleTitle={article.title}
                    href={`/articles/${encodeURIComponent(article.id)}`}
                    sourceUrl={article.url}
                    className={styles.articleLink}
                  >
                    <span className={styles.publisher}>{article.source?.title ?? "기업 기술 블로그"}</span>
                    <span className={styles.articleTitle}>{article.title}</span>
                    {article.excerpt && <span className={styles.excerpt}>{article.excerpt}</span>}
                  </ArticleLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyResults}>추천 사례는 검색으로 더 찾아볼 수 있습니다.</p>
          )}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="developer-research">
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>개발자 · 구현 사례</p>
          <h2 id="developer-research">기술 주제와 원문으로 구현 맥락을 확인하세요</h2>
          <p>프론트엔드, 백엔드, AI·ML 등 주제별로 최신 글을 보고, 각 회사가 공개한 원문에서 선택의 배경을 확인할 수 있습니다.</p>
        </div>
        <nav className={styles.topicLinks} aria-label="개발 기술 주제">
          <AudienceLandingActionLink href="/topics/frontend" action="developer_topic">프론트엔드 글 보기</AudienceLandingActionLink>
          <AudienceLandingActionLink href="/topics/backend" action="developer_topic">백엔드 글 보기</AudienceLandingActionLink>
          <AudienceLandingActionLink href="/topics/ai_ml" action="developer_topic">AI·ML 글 보기</AudienceLandingActionLink>
        </nav>
        <div className={styles.mcpSetup}>
          <p className={styles.mcpNote}>AI 코딩 도구에 연결할 원격 MCP 주소</p>
          <code>https://www.techgotgan.co.kr/api/mcp</code>
          <AudienceLandingActionLink href="https://github.com/jundolee/techgotgan/blob/main/tools/techgotgan-mcp/README.ko.md" action="mcp_setup" external>
            한국어 연결 방법 보기 →
          </AudienceLandingActionLink>
        </div>
      </section>
    </main>
  );
}
