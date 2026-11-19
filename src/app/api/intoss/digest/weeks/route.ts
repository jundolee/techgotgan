import { listRecentDigestWeeks } from "@/lib/data/weekly-digests";
import { intossOptions, withIntossCors } from "@/lib/intoss-cors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return withIntossCors(request, Response.json(await listRecentDigestWeeks(), {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=1800" },
    }));
  } catch (error) {
    console.error("App-in-Toss digest archive request failed:", error);
    return withIntossCors(request, Response.json({ error: "주간 큐레이션을 불러오지 못했어요." }, { status: 503 }));
  }
}

export function OPTIONS(request: Request) {
  return intossOptions(request);
}
