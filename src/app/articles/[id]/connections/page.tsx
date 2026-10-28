import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { ArticleReadingPath, type ReadingPathArticle } from "@/components/article-reading-path";
import { PageHeader } from "@/components/page-header";
import { getArticlePreview, getRelatedArticles } from "@/lib/data/related-articles";
import { getPublicGraphArticle } from "@/lib/data/dev-article-graph";
import { isConnectionInsightEnabled } from "@/lib/ingestion/article-connection-insight";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "이 글과 이어지는 글", robots: { index: false, follow: false } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ArticleConnectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const enabled = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ARTICLE_CONNECTION_ENABLED === "true";
  if (!enabled) redirect(`/articles/${encodeURIComponent(id)}`);
  await connection();

  const databaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("[SENSITIVE]"));
  const current = databaseConfigured ? await getArticlePreview(id) : await getPublicGraphArticle(id);
  if (!current) notFound();
  const related = "related" in current ? current.related : await getRelatedArticles(current.id, current.category, current.tags);
  const detailHref = `${databaseConfigured ? "" : "https://www.techgotgan.co.kr"}/articles/${encodeURIComponent(current.id)}`;
  const articles: ReadingPathArticle[] = related.map((item) => ({
    id: item.id,
    title: item.title,
    sourceTitle: item.sourceTitle,
    excerpt: item.excerpt ?? null,
    publishedAt: "publishedAt" in item ? item.publishedAt ?? null : null,
    kind: "kind" in item ? item.kind : item.isSemanticMatch ? "semantic" : item.isSemanticMatch === false ? "topic" : "related",
    detailHref: `${databaseConfigured ? "" : "https://www.techgotgan.co.kr"}/articles/${encodeURIComponent(item.id)}`,
  }));

  return <main style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <PageHeader navHref={detailHref} navLabel="현재 글" />
    <header style={{ display: "grid", gap: 8 }}>
      <p style={{ color: "var(--seed-color-fg-brand)", fontSize: 13, fontWeight: 700 }}>글을 이어서 읽어보기</p>
      <h1 style={{ fontSize: "clamp(26px,5vw,34px)", lineHeight: 1.3 }}>이 글에서 다음 글로</h1>
      <p style={{ color: "var(--seed-color-fg-neutral-muted)", lineHeight: 1.6 }}>지금 읽는 글과 내용이나 주제가 닿는 글을 모았어요. 궁금한 글을 골라 읽고, 추천 이유도 확인해 보세요.</p>
    </header>
    <ArticleReadingPath
      current={{ id: current.id, title: current.title, sourceTitle: current.sourceTitle, excerpt: current.excerpt ?? null, detailHref }}
      articles={articles}
      explanationsAvailable={isConnectionInsightEnabled()}
    />
  </main>;
}
