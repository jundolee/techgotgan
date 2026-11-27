const targets = [
  "https://blog.rapportlabs.kr/rss",
  "https://techblog.woowahan.com/feed/",
];

const proxyBase = process.env.RSS_PROXY_URL?.trim();
const token = process.env.RSS_PROXY_TOKEN?.trim();

if (!proxyBase || !token) {
  console.error("RSS_PROXY_URL and RSS_PROXY_TOKEN are required for the proxy probe.");
  process.exitCode = 1;
} else {
  let failed = false;

  for (const target of targets) {
    const targetUrl = new URL(target);
    const requestUrl = new URL(proxyBase);
    requestUrl.searchParams.set("url", target);
    const startedAt = Date.now();

    try {
      const response = await fetch(requestUrl, {
        headers: {
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
          Authorization: `Bearer ${token}`,
        },
        redirect: "manual",
        signal: AbortSignal.timeout(20_000),
      });
      const body = new Uint8Array(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") ?? "";
      const prefix = new TextDecoder().decode(body.subarray(0, 256)).trimStart();
      const xml = /(?:application|text)\/(?:rss\+xml|atom\+xml|xml)/i.test(contentType) ||
        /^(?:<\?xml\b|<rss\b|<feed\b|<rdf:RDF\b)/i.test(prefix);

      console.log(JSON.stringify({
        target: `${targetUrl.origin}${targetUrl.pathname}`,
        status: response.status,
        contentType,
        bytes: body.byteLength,
        elapsedMs: Date.now() - startedAt,
        xml,
      }));

      if (!response.ok || !xml) failed = true;
    } catch (error) {
      console.log(JSON.stringify({
        target: `${targetUrl.origin}${targetUrl.pathname}`,
        error: error instanceof Error ? error.name : "UnknownError",
        elapsedMs: Date.now() - startedAt,
      }));
      failed = true;
    }
  }

  if (failed) process.exitCode = 1;
}
