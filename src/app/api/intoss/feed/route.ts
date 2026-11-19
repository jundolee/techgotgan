import { getCachedArticleFeed, getCachedArticlesForSource } from "@/lib/data/articles";
import { intossOptions, withIntossCors } from "@/lib/intoss-cors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const sourceId = new URL(request.url).searchParams.get("source");
    if (sourceId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceId)) {
      return withIntossCors(request, Response.json({ error: "기업 블로그를 찾을 수 없어요." }, { status: 400 }));
    }
    const articles = sourceId ? await getCachedArticlesForSource(sourceId, 50) : await getCachedArticleFeed(100);
    return withIntossCors(
      request,
      Response.json(articles, {
        headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
      })
    );
  } catch (error) {
    console.error("App-in-Toss feed request failed:", error);
    return withIntossCors(request, Response.json({ error: "글 목록을 불러오지 못했어요." }, { status: 503 }));
  }
}

export function OPTIONS(request: Request) {
  return intossOptions(request);
}
