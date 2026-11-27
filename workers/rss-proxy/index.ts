import { handleRssProxyRequest } from "../../src/lib/ingestion/rss-proxy-handler";

interface Env {
  RSS_PROXY_TOKEN?: string;
}

const worker = {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRssProxyRequest(request, env.RSS_PROXY_TOKEN);
  },
};

export default worker;
