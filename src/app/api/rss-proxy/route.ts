import { handleRssProxyRequest } from "@/lib/ingestion/rss-proxy-handler";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleRssProxyRequest(request, process.env.RSS_PROXY_TOKEN);
}
