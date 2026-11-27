import assert from "node:assert/strict";
import test from "node:test";
import {
  getProxyAuthorizationHeaders,
  getProxyFetchOptions,
  getProxyUpstreamUserAgent,
  getProxiedUrl,
  isAllowedProxyTarget,
  isBlockedDomain,
  isRssProxyUrl,
} from "../src/lib/ingestion/feed-proxy";
import { INGESTION_USER_AGENT, RSS_PROXY_USER_AGENT } from "../src/lib/ingestion/user-agent";

test("blocked RSS sources include the hosts that fail on hosted runners", () => {
  assert.equal(isBlockedDomain("https://techblog.woowahan.com/feed/"), true);
  assert.equal(isBlockedDomain("https://blog.rapportlabs.kr/rss"), true);
  assert.equal(isBlockedDomain("https://techblog.woowahan.com.attacker.example/feed/"), false);
});

test("proxy URLs preserve the configured route without adding a trailing slash", () => {
  const previousUrl = process.env.RSS_PROXY_URL;
  process.env.RSS_PROXY_URL = "https://worker.example/api/rss-proxy/";
  try {
    const proxied = getProxiedUrl("https://techblog.woowahan.com/feed/");
    const parsed = new URL(proxied);
    assert.equal(parsed.origin, "https://worker.example");
    assert.equal(parsed.pathname, "/api/rss-proxy");
    assert.equal(parsed.searchParams.get("url"), "https://techblog.woowahan.com/feed/");
  } finally {
    if (previousUrl === undefined) delete process.env.RSS_PROXY_URL;
    else process.env.RSS_PROXY_URL = previousUrl;
  }
});

test("proxy targets require HTTPS and an allowlisted public host", () => {
  assert.equal(isAllowedProxyTarget("https://techblog.woowahan.com/feed/"), true);
  assert.equal(isAllowedProxyTarget("https://blog.rapportlabs.kr/rss"), true);
  assert.equal(isAllowedProxyTarget("http://techblog.woowahan.com/feed/"), false);
  assert.equal(isAllowedProxyTarget("https://example.com/feed.xml"), false);
  assert.equal(isAllowedProxyTarget("https://user@techblog.woowahan.com/feed/"), false);
  assert.equal(isAllowedProxyTarget("https://techblog.woowahan.com:8443/feed/"), false);
});

test("proxy credentials are attached only to the configured HTTPS endpoint", () => {
  const previousUrl = process.env.RSS_PROXY_URL;
  const previousToken = process.env.RSS_PROXY_TOKEN;
  process.env.RSS_PROXY_URL = "https://worker.example/api/rss-proxy";
  process.env.RSS_PROXY_TOKEN = "test-proxy-token";
  try {
    const proxied = getProxiedUrl("https://techblog.woowahan.com/feed/");
    assert.equal(isRssProxyUrl(proxied), true);
    assert.deepEqual(getProxyAuthorizationHeaders(proxied), { Authorization: "Bearer test-proxy-token" });
    assert.deepEqual(getProxyFetchOptions(proxied), {
      headers: { Authorization: "Bearer test-proxy-token" },
      redirect: "manual",
    });
    assert.deepEqual(getProxyAuthorizationHeaders("https://techblog.woowahan.com/feed/"), {});
    assert.deepEqual(getProxyAuthorizationHeaders("https://worker.example/api/rss-proxy.evil"), {});
  } finally {
    if (previousUrl === undefined) delete process.env.RSS_PROXY_URL;
    else process.env.RSS_PROXY_URL = previousUrl;
    if (previousToken === undefined) delete process.env.RSS_PROXY_TOKEN;
    else process.env.RSS_PROXY_TOKEN = previousToken;
  }
});

test("the proxy uses a site-specific user agent for Woowahan", () => {
  assert.equal(getProxyUpstreamUserAgent("https://techblog.woowahan.com/feed/"), RSS_PROXY_USER_AGENT);
  assert.equal(getProxyUpstreamUserAgent("https://blog.rapportlabs.kr/rss"), INGESTION_USER_AGENT);
});
