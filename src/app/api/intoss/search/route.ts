import { searchArticles } from "@/lib/data/articles";
import { intossOptions, withIntossCors } from "@/lib/intoss-cors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let query: unknown;
  try {
    const body: unknown = await request.json();
    query = typeof body === "object" && body !== null && "query" in body
      ? (body as { query?: unknown }).query
      : undefined;
  } catch {
    return withIntossCors(request, Response.json({ error: "검색어를 확인해 주세요." }, { status: 400 }));
  }

  const normalizedQuery = typeof query === "string" ? query.trim() : "";
  const queryLength = Array.from(normalizedQuery).length;
  if (queryLength < 2 || queryLength > 80) {
    return withIntossCors(request, Response.json({ error: "검색어는 2자 이상 80자 이하로 입력해 주세요." }, { status: 400 }));
  }

  try {
    const articles = await searchArticles(normalizedQuery, null);
    return withIntossCors(
      request,
      Response.json(articles.slice(0, 100), { headers: { "Cache-Control": "private, no-store" } })
    );
  } catch (error) {
    console.error("App-in-Toss article search failed:", error);
    return withIntossCors(request, Response.json({ error: "검색 결과를 불러오지 못했어요." }, { status: 503 }));
  }
}

export function OPTIONS(request: Request) {
  return intossOptions(request);
}
