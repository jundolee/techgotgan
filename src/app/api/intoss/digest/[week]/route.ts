import { getWeeklyDigest, isValidDigestWeek } from "@/lib/data/weekly-digests";
import { intossOptions, withIntossCors } from "@/lib/intoss-cors";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: RouteContext<"/api/intoss/digest/[week]">) {
  const { week } = await params;
  if (!isValidDigestWeek(week)) {
    return withIntossCors(request, Response.json({ error: "주간 큐레이션을 찾을 수 없어요." }, { status: 404 }));
  }

  try {
    const digest = await getWeeklyDigest(week);
    if (!digest) {
      return withIntossCors(request, Response.json({ error: "주간 큐레이션을 찾을 수 없어요." }, { status: 404 }));
    }
    const latestArticles = digest.latestArticles.map((article) => ({
      id: article.id,
      title: article.title,
      url: article.url,
      excerpt: article.excerpt,
      thumbnail_url: null,
      published_at: article.published_at,
      click_count: 0,
      category: article.category ?? "general",
      tags: [],
      source: article.source ? { ...article.source, favicon_url: null } : null,
    }));
    return withIntossCors(request, Response.json({ ...digest, latestArticles }, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=900" },
    }));
  } catch (error) {
    console.error("App-in-Toss weekly digest request failed:", error);
    return withIntossCors(request, Response.json({ error: "주간 큐레이션을 불러오지 못했어요." }, { status: 503 }));
  }
}

export function OPTIONS(request: Request) {
  return intossOptions(request);
}
