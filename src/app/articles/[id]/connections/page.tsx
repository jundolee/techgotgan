import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { getArticlePreview, getRelatedArticles } from "@/lib/data/related-articles";
import { getPublicGraphArticle } from "@/lib/data/dev-article-graph";
import { ArticleGraphView, type ArticleGraphEdge, type ArticleGraphNode } from "@/components/article-graph-view";
import { isConnectionInsightEnabled } from "@/lib/ingestion/article-connection-insight";

export const runtime = "nodejs";
export const metadata: Metadata = { title: "글 연결 지도", robots: { index: false, follow: false } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMIT = 4;

export default async function ArticleConnectionsPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ trail?: string | string[] }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await connection();
  const { trail } = await searchParams;
  const previousIds = typeof trail === "string" ? trail.split(",").filter((value) => UUID.test(value) && value !== id).slice(-LIMIT) : [];
  const databaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("[SENSITIVE]"));

  async function load(id: string) {
    // Only public metadata is needed; owner-only AI summaries are never requested.
    const article = databaseConfigured ? await getArticlePreview(id) : await getPublicGraphArticle(id);
    if (!article) return null;
    const related = "related" in article ? article.related : await getRelatedArticles(article.id, article.category, article.tags);
    return { id: article.id, title: article.title, sourceTitle: article.sourceTitle, excerpt: article.excerpt ?? null, category: "category" in article ? article.category : "general", tags: "tags" in article ? article.tags ?? [] : [], related };
  }
  const loaded = await Promise.all([...previousIds, id].map(load));
  const current = loaded[loaded.length - 1];
  if (!current) notFound();
  // Do not draw edges supplied through a URL unless they occur in the recommendation data.
  const path = [current];
  for (let index = loaded.length - 2; index >= 0; index--) {
    const previous = loaded[index];
    if (!previous || !previous.related.some((item) => item.id === path[0].id)) break;
    path.unshift(previous);
  }
  function pathUrl(targetId: string, earlierIds: string[]) {
    const query = earlierIds.length ? `?trail=${earlierIds.slice(-LIMIT).join(",")}` : "";
    return `/articles/${encodeURIComponent(targetId)}/connections${query}`;
  }

  type Recommendation = (typeof current.related)[number];
  const graphKind = (item: Recommendation): ArticleGraphNode["kind"] => {
    if ("kind" in item) return item.kind;
    return item.isSemanticMatch ? "semantic" : item.isSemanticMatch === false ? "topic" : "related";
  };
  const detailUrl = (articleId: string) => `${databaseConfigured ? "" : "https://www.techgotgan.co.kr"}/articles/${encodeURIComponent(articleId)}`;
  const graphNodes: ArticleGraphNode[] = [
    { id: current.id, title: current.title, sourceTitle: current.sourceTitle, kind: "current", detailHref: detailUrl(current.id) },
    ...current.related.map((item) => ({ id: item.id, title: item.title, sourceTitle: item.sourceTitle, kind: graphKind(item), similarityScore: item.similarityScore, detailHref: detailUrl(item.id) })),
  ];
  const graphEdges: ArticleGraphEdge[] = current.related.map((item) => ({ from: current.id, to: item.id, kind: graphKind(item) === "semantic" ? "semantic" : graphKind(item) === "topic" ? "topic" : "related" }));

  return <main style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <PageHeader navHref={detailUrl(current.id)} navLabel="현재 글" />
    <header style={{ display: "grid", gap: 8 }}>
      <p style={{ color: "var(--seed-color-fg-brand)", fontSize: 13, fontWeight: 700 }}>글을 따라 이어가는 엔지니어링 맥락</p>
      <h1>글 연결 그래프</h1>
      <p style={{ color: "var(--seed-color-fg-neutral-muted)" }}>노드를 클릭하면 그 글을 중심으로 관계가 다시 펼쳐집니다.</p>
    </header>
    <p style={{ padding: 12, background: "var(--seed-color-bg-neutral-weak)", borderRadius: 10, fontSize: 13, lineHeight: 1.6, color: "var(--seed-color-fg-neutral-muted)" }}>연결은 자동 추천 결과입니다. 주제나 의미가 닿는 글을 보여주며, 같은 문제나 해결책이라는 뜻은 아닙니다.</p>
    {path.length > 1 && <nav aria-label="탐색한 글" style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "var(--seed-color-fg-neutral-muted)" }}>
      <span>탐색 경로</span>{path.slice(0, -1).map((item, index) => <Link key={item.id} href={pathUrl(item.id, path.slice(0, index).map((entry) => entry.id))}>{item.title}</Link>)}
      <span aria-current="page">{current.title}</span>
    </nav>}
    <ArticleGraphView nodes={graphNodes} edges={graphEdges} expandedIds={[current.id]} explanationsAvailable={isConnectionInsightEnabled()} />
    {path.length > 1 && <nav className="article-graph-history" aria-label="탐색 경로">
      <span>탐색 경로:</span>{path.map((item, index) => <span key={item.id}>{index > 0 && " → "}{item.title}</span>)}
    </nav>}
  </main>;
}
