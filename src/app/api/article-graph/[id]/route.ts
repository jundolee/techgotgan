import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getArticlePreview, getRelatedArticles } from "@/lib/data/related-articles";
import { getPublicGraphArticle } from "@/lib/data/dev-article-graph";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid article id" }, { status: 400 });

  const databaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("[SENSITIVE]"));
  const article = databaseConfigured ? await getArticlePreview(id) : await getPublicGraphArticle(id);
  if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });
  const related = "related" in article ? article.related : await getRelatedArticles(article.id, article.category, article.tags, 12);
  const nodes = related.map((item) => ({
    id: item.id,
    title: item.title,
    sourceTitle: item.sourceTitle,
    kind: "kind" in item ? item.kind : item.isSemanticMatch ? "semantic" : item.isSemanticMatch === false ? "topic" : "related",
    similarityScore: item.similarityScore ?? null,
    detailHref: `${databaseConfigured ? "" : "https://www.techgotgan.co.kr"}/articles/${encodeURIComponent(item.id)}`,
  }));
  const edges = related.map((item) => ({
    from: article.id,
    to: item.id,
    kind: nodes.find((node) => node.id === item.id)?.kind ?? "related",
  }));

  return NextResponse.json({ nodes, edges }, { headers: { "Cache-Control": "no-store" } });
}
