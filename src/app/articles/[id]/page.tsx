import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { RelatedArticleList } from "@/components/related-article-list";
import { markArticleRead } from "@/lib/data/articles";
import { ArticleSummaryCopy } from "@/components/article-summary-copy";
import { ShareButton } from "@/components/share-button";
import { SourceArticleLink } from "@/components/source-article-link";
import { getArticlePreview, getRelatedArticles, type ArticlePreview } from "@/lib/data/related-articles";
import { getPublicTechnologyIndex, matchesTechnologyTermText } from "@/lib/data/public-hubs";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { SITE_NAME, SITE_URL } from "@/app/seo";

export const runtime = "nodejs";

const ENGINEERING_BOX_METAS = [
  { icon: "🚨", label: "문제 & 배경", bg: "#fff8f8", border: "#fed7d7", tagColor: "#c53030" },
  { icon: "🛠️", label: "기술 & 해결책", bg: "#f0f9ff", border: "#bae6fd", tagColor: "#0284c7" },
  { icon: "💡", label: "교훈 & 주의점", bg: "#fefce8", border: "#fef08a", tagColor: "#b45309" },
];

type ArticlePageProps = { params: Promise<{ id: string }> };

async function getArticle(id: string, options: { includeSummary?: boolean } = {}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  return getArticlePreview(id, options);
}

function isIndexableArticle(article: ArticlePreview | null): article is ArticlePreview {
  return Boolean(article?.summary && article.summaryBasis === "full_article" && article.title.trim().length >= 12 && (article.excerpt?.trim().length ?? 0) >= 40);
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const article = await getArticle(id, { includeSummary: true });
  if (!article) return { robots: { index: false, follow: false } };
  const indexable = isIndexableArticle(article);
  const description = article.excerpt?.slice(0, 160) ?? `원문 발행처에서 확인할 수 있는 글입니다. ${SITE_NAME}`;
  const url = `${SITE_URL}/articles/${encodeURIComponent(article.id)}`;
  return {
    title: article.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "ko_KR",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
    },
    robots: { index: indexable, follow: true },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  await connection();
  const { id } = await params;

  const userPromise = getCurrentUser();
  const articlePromise = getArticle(id, { includeSummary: true });
  const relatedPromise = getRelatedArticles(id);
  const [article, initialRelated, user] = await Promise.all([articlePromise, relatedPromise, userPromise]);
  if (!article) notFound();

  if (user) {
    try {
      // A hard reload can cancel the client-side click action; mark the opened page read here too.
      await markArticleRead(user.id, article.id);
    } catch (error) {
      console.error("Failed to persist article read state during page render:", error);
    }
  }

  const [related, technologyIndex] = await Promise.all([
    initialRelated.length > 0
      ? Promise.resolve(initialRelated)
      : getRelatedArticles(article.id, article.category, article.tags),
    isIndexableArticle(article) ? getPublicTechnologyIndex() : Promise.resolve([]),
  ]);
  // Stored tags can mention a technology incidentally; use the same visible-text
  // relevance check as technology hubs before creating a crawl link.
  const relatedTechnologies = technologyIndex
    .filter(({ term }) => matchesTechnologyTermText(article.title, article.excerpt, term.slug))
    .slice(0, 5);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 0 56px" }}>
      <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>← {SITE_NAME} 목록으로</Link>
      <Text as="p" textStyle="t2Medium" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 28 }}>
        {article.sourceTitle ?? "출처 미상"}{article.publishedAt ? ` · ${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(article.publishedAt))}` : ""}
      </Text>
      <Text as="h1" textStyle="t8Bold" color="fg.neutral" style={{ marginTop: 12, lineHeight: 1.25 }}>{article.title}</Text>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <ShareButton
          title={article.title}
          url={`/articles/${encodeURIComponent(article.id)}`}
          size="small"
          variant="neutralWeak"
        />
      </div>
      {article.summary && <section aria-labelledby="ai-summary-heading" style={{ marginTop: 28, border: `1px solid #fbd8bc`, borderRadius: 20, padding: "24px 28px", background: "linear-gradient(180deg, #fffaf5 0%, #ffffff 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span aria-hidden="true" style={{ fontSize: 16 }}>✨</span>
            <Text as="h2" id="ai-summary-heading" textStyle="t5Bold" color="fg.neutral">AI 엔지니어링 브리핑</Text>
          </div>
        </div>
          <div style={{ borderLeft: "3px solid var(--seed-color-bg-brand-solid, #eb641c)", paddingLeft: 14, marginBottom: 18 }}>
            <ArticleSummaryCopy text={article.summary.lead} className="article-summary-lead" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {article.summary.keyPoints.map((point, index) => {
              const meta = ENGINEERING_BOX_METAS[index] ?? { icon: "📌", label: `핵심 ${index + 1}`, bg: "#ffffff", border: "#fed7aa", tagColor: "var(--seed-color-fg-brand)" };
              return (
                <div key={`${index}-${point}`} style={{ background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 14, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span aria-hidden="true" style={{ fontSize: 14 }}>{meta.icon}</span>
                    <Text as="span" textStyle="t2Bold" style={{ color: meta.tagColor }}>{meta.label}</Text>
                  </div>
              <ArticleSummaryCopy text={point} className="article-summary-point" />
                </div>
              );
            })}
          </div>
      </section>}
      <SourceArticleLink href={article.url} surface="article_detail" style={{ display: "flex", justifyContent: "center", marginTop: 18, padding: 16, borderRadius: 14, background: "var(--seed-color-bg-brand-solid, #eb641c)", color: "white", textDecoration: "none", fontWeight: 700 }}>원문 읽기 ↗</SourceArticleLink>
      {relatedTechnologies.length > 0 && (
        <section aria-labelledby="related-technology-hubs" style={{ display: "grid", gap: 10, marginTop: 20 }}>
          <Text as="h2" id="related-technology-hubs" textStyle="t5Bold" color="fg.neutral">
            관련 기술 허브
          </Text>
          <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
            같은 기술을 다룬 다른 회사 글도 찾아보세요.
          </Text>
          <ul style={{ display: "flex", gap: 8, flexWrap: "wrap", listStyle: "none" }}>
            {relatedTechnologies.map(({ term, articleCount }) => (
              <li key={term.slug}>
                <Link
                  href={`/technologies/${term.slug}`}
                  style={{ display: "inline-flex", gap: 6, alignItems: "center", border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 999, padding: "6px 10px" }}
                >
                  {term.label} 기술 블로그
                  <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">{articleCount}</Text>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div style={{ marginTop: 28 }}>
        <RelatedArticleList articleId={article.id} items={related.map((item) => ({ ...item, href: `/articles/${encodeURIComponent(item.id)}` }))} />
      </div>
    </main>
  );
}
