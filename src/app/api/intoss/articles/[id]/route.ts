import { getArticlePreview } from "@/lib/data/related-articles";
import { intossOptions, withIntossCors } from "@/lib/intoss-cors";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: RouteContext<"/api/intoss/articles/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return withIntossCors(request, Response.json({ error: "글을 찾을 수 없어요." }, { status: 404 }));
  }

  try {
    const article = await getArticlePreview(id, { includeSummary: true });
    if (!article) {
      return withIntossCors(request, Response.json({ error: "글을 찾을 수 없어요." }, { status: 404 }));
    }

    return withIntossCors(
      request,
      Response.json(article, {
        headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
      })
    );
  } catch (error) {
    console.error("App-in-Toss article detail request failed:", error);
    return withIntossCors(request, Response.json({ error: "글을 불러오지 못했어요." }, { status: 503 }));
  }
}

export function OPTIONS(request: Request) {
  return intossOptions(request);
}
