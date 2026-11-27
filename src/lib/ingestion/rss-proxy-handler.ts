import { getProxyUpstreamUserAgent, isBlockedDomain } from "./feed-proxy";

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 4;

function hasValidProxyToken(authorization: string | null, expectedToken: string | undefined): boolean {
  const prefix = "Bearer ";
  if (!expectedToken || !authorization?.startsWith(prefix)) return false;
  const provided = authorization.slice(prefix.length);
  if (provided.length !== expectedToken.length) return false;

  let difference = 0;
  for (let index = 0; index < expectedToken.length; index += 1) {
    difference |= expectedToken.charCodeAt(index) ^ provided.charCodeAt(index);
  }
  return difference === 0;
}

async function readBoundedResponse(response: Response): Promise<Uint8Array> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_RESPONSE_BYTES) throw new Error("upstream_response_too_large");
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("upstream_response_too_large");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function emptyResponse(status: number): Response {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isAllowedTarget(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash && !url.port &&
      isBlockedDomain(url.toString());
  } catch {
    return false;
  }
}

export async function handleRssProxyRequest(
  request: Request,
  expectedToken: string | undefined,
  upstreamFetch: typeof fetch = fetch,
): Promise<Response> {
  if (new URL(request.url).pathname !== "/api/rss-proxy") return emptyResponse(404);
  if (!hasValidProxyToken(request.headers.get("authorization"), expectedToken)) return emptyResponse(404);

  const rawUrl = new URL(request.url).searchParams.get("url");
  if (!rawUrl || rawUrl.length > 2048 || !isAllowedTarget(rawUrl)) return emptyResponse(403);

  let target = new URL(rawUrl);
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    let upstream: Response;
    try {
      upstream = await upstreamFetch(target, {
        headers: {
          "User-Agent": getProxyUpstreamUserAgent(target.toString()),
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, image/*, */*",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      return emptyResponse(502);
    }

    if ([301, 302, 303, 307, 308].includes(upstream.status)) {
      const location = upstream.headers.get("location");
      await upstream.body?.cancel();
      if (!location || redirectCount === MAX_REDIRECTS) return emptyResponse(502);
      try {
        const redirected = new URL(location, target);
        if (!isAllowedTarget(redirected.toString())) return emptyResponse(403);
        target = redirected;
        continue;
      } catch {
        return emptyResponse(502);
      }
    }

    if (!upstream.ok) {
      await upstream.body?.cancel();
      return emptyResponse(upstream.status);
    }

    try {
      const body = await readBoundedResponse(upstream);
      return new Response(body.buffer as ArrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      return emptyResponse(error instanceof Error && error.message === "upstream_response_too_large" ? 413 : 502);
    }
  }

  return emptyResponse(502);
}
