import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getArticlePreview, getRelatedArticles } from "@/lib/data/related-articles";
import { getPublicGraphArticle } from "@/lib/data/dev-article-graph";
import { explainArticleConnections, type ConnectionSource } from "@/lib/ingestion/article-connection-insight";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toConnectionSource(article: {
  id: string;
  title: string;
  excerpt?: string | null;
  category?: string | null;
  tags?: string[] | null;
}): ConnectionSource {
  return {
    id: article.id,
    title: article.title,
    excerpt: article.excerpt ?? null,
    category: article.category ?? "general",
    tags: article.tags ?? [],
  };
}

export async function POST(request: Request) {
  await connection();
  let body: { sourceId?: unknown; relatedId?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.sourceId !== "string" || typeof body.relatedId !== "string" || !UUID.test(body.sourceId) || !UUID.test(body.relatedId) || body.sourceId === body.relatedId) {
    return NextResponse.json({ error: "Invalid article pair" }, { status: 400 });
  }

  const databaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("[SENSITIVE]"));
  const [source, target] = await Promise.all([
    databaseConfigured ? getArticlePreview(body.sourceId) : getPublicGraphArticle(body.sourceId),
    databaseConfigured ? getArticlePreview(body.relatedId) : getPublicGraphArticle(body.relatedId),
  ]);
  if (!source || !target) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  const sourceConnections = "related" in source ? source.related : await getRelatedArticles(source.id, source.category, source.tags, 12);
  if (!sourceConnections.some((candidate) => candidate.id === target.id)) {
    return NextResponse.json({ error: "These articles are not connected by the current recommendation data" }, { status: 422 });
  }

  let rateLimited = false;
  const authorizeGeneration = async () => {
    if (!databaseConfigured) return true;
    const secret = process.env.CRON_SECRET;
    const remoteAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim();
    if (!secret || !remoteAddress) { rateLimited = true; return false; }
    const usageDay = new Date().toISOString().slice(0, 10);
    const requesterHash = createHmac("sha256", secret).update(`${usageDay}:${remoteAddress}`).digest("hex");
    try {
      const { data, error } = await (await import("@/lib/supabase/service")).createServiceClient().rpc("consume_article_connection_insight_request", {
        requested_day: usageDay,
        requested_hash: requesterHash,
        daily_limit: 12,
      });
      if (error || data !== true) { rateLimited = true; return false; }
      return true;
    } catch {
      rateLimited = true;
      return false;
    }
  };
  const insights = await explainArticleConnections(toConnectionSource(source), [toConnectionSource(target)], { authorizeGeneration });
  return NextResponse.json({ insight: insights.get(target.id) ?? null, rateLimited }, { headers: { "Cache-Control": "no-store" } });
}
