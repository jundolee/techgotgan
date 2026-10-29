import { createMcpHandler } from "@modelcontextprotocol/server";
import { createTechgotganServer } from "../../../../tools/techgotgan-mcp/src/server";

export const runtime = "nodejs";

const MAX_REQUEST_BODY_BYTES = 16_384;
const ALLOWED_HOSTS = new Set(["www.techgotgan.co.kr", "techgotgan.co.kr", "localhost", "127.0.0.1"]);
const handler = createMcpHandler(createTechgotganServer);

function validateHost(request: Request): Response | null {
  const host = (request.headers.get("host") ?? new URL(request.url).host)
    .split(":")[0]
    .toLowerCase();
  return ALLOWED_HOSTS.has(host) ? null : new Response("Invalid host", { status: 421 });
}

async function handleMcp(request: Request): Promise<Response> {
  const invalidHost = validateHost(request);
  if (invalidHost) return invalidHost;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BODY_BYTES) return new Response("Request body too large", { status: 413 });

  return handler.fetch(request);
}

export const GET = handleMcp;
export const POST = handleMcp;
export const DELETE = handleMcp;
