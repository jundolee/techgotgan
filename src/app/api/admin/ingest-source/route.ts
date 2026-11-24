import { assertAdminAccess } from "@/lib/admin-access";
import { ingestSourceById } from "@/lib/ingestion/ingest-source-now";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request): Promise<Response> {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== requestOrigin) || (!origin && fetchSite !== "same-origin")) {
    return Response.json({ ok: false, message: "잘못된 요청입니다." }, { status: 403 });
  }

  try {
    await assertAdminAccess();
  } catch {
    return Response.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 });
  }

  const id = typeof body === "object" && body !== null && "id" in body && typeof body.id === "string"
    ? body.id.trim()
    : "";
  if (!SOURCE_ID_PATTERN.test(id)) {
    return Response.json({ ok: false, message: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await ingestSourceById(id);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
