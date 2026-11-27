import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/rss-proxy/route";
import { RSS_PROXY_USER_AGENT } from "../src/lib/ingestion/user-agent";

const proxyUrl = "https://worker.test/api/rss-proxy";
const upstreamUrl = "https://techblog.woowahan.com/feed/";
const token = "test-rss-proxy-token";

async function withProxyConfig(run: () => Promise<void>): Promise<void> {
  const previousUrl = process.env.RSS_PROXY_URL;
  const previousToken = process.env.RSS_PROXY_TOKEN;
  process.env.RSS_PROXY_URL = proxyUrl;
  process.env.RSS_PROXY_TOKEN = token;
  try {
    await run();
  } finally {
    if (previousUrl === undefined) delete process.env.RSS_PROXY_URL;
    else process.env.RSS_PROXY_URL = previousUrl;
    if (previousToken === undefined) delete process.env.RSS_PROXY_TOKEN;
    else process.env.RSS_PROXY_TOKEN = previousToken;
  }
}

function authorizedRequest(targetUrl = upstreamUrl, authorization = `Bearer ${token}`): Request {
  const url = new URL(proxyUrl);
  url.searchParams.set("url", targetUrl);
  return new Request(url, { headers: { Authorization: authorization } });
}

test("the authenticated proxy returns an allowlisted feed without forwarding its token", async () => {
  await withProxyConfig(async () => {
    const previousFetch = globalThis.fetch;
    const observed: { headers?: Headers; redirect?: RequestRedirect } = {};
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), upstreamUrl);
      observed.headers = new Headers(init?.headers);
      observed.redirect = init?.redirect;
      return new Response("<rss version=\"2.0\"><channel><title>sample</title></channel></rss>", {
        headers: { "Content-Type": "application/rss+xml" },
      });
    };

    try {
      const response = await GET(authorizedRequest());
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") ?? "", /application\/rss\+xml/i);
      assert.match(await response.text(), /<rss/);
      assert.equal(observed.redirect, "manual");
      assert.equal(observed.headers?.get("user-agent"), RSS_PROXY_USER_AGENT);
      assert.equal(observed.headers?.has("authorization"), false);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});

test("the proxy hides authentication failures and rejects unapproved targets", async () => {
  await withProxyConfig(async () => {
    assert.equal((await GET(authorizedRequest(upstreamUrl, "Bearer wrong-token"))).status, 404);
    assert.equal((await GET(authorizedRequest("https://example.com/feed.xml"))).status, 403);
  });
});

test("the proxy stops redirects outside the allowlist", async () => {
  await withProxyConfig(async () => {
    const previousFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(null, {
        status: 302,
        headers: { Location: "https://example.com/redirected-feed.xml" },
      });
    };

    try {
      const response = await GET(authorizedRequest());
      assert.equal(response.status, 403);
      assert.equal(calls, 1);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
