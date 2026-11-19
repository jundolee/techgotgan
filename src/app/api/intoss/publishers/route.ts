import { listSources } from "@/lib/data/sources";
import { intossOptions, withIntossCors } from "@/lib/intoss-cors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const sources = await listSources();
    const publishers = sources
      .filter((source) => source.is_active)
      .map(({ id, title, site_url, favicon_url }) => ({ id, title, site_url, favicon_url }))
      .sort((left, right) => (left.title ?? left.site_url).localeCompare(right.title ?? right.site_url, "ko"));
    return withIntossCors(request, Response.json(publishers, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=900" },
    }));
  } catch (error) {
    console.error("App-in-Toss publisher directory request failed:", error);
    return withIntossCors(request, Response.json({ error: "기업 블로그 목록을 불러오지 못했어요." }, { status: 503 }));
  }
}

export function OPTIONS(request: Request) {
  return intossOptions(request);
}
