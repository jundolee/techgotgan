import assert from "node:assert/strict";
import test from "node:test";
import {
  getProxyAuthorizationHeaders,
  getProxyFetchOptions,
  getProxyUpstreamUserAgent,
  getProxiedUrl,
  isAllowedProxyTarget,
  isBlockedDomain,
} from "../src/lib/ingestion/feed-proxy";
import { INGESTION_USER_AGENT, RSS_PROXY_USER_AGENT } from "../src/lib/ingestion/user-agent";

test("blocked RSS sources include Yozm and Woowahan while rejecting lookalike hosts", () => {
  assert.equal(isBlockedDomain("https://yozm.wishket.com/magazine/feed/"), true);
  assert.equal(isBlockedDomain("https://techblog.woowahan.com/feed/"), true);
  assert.equal(isBlockedDomain("https://techblog.woowahan.com.attacker.example/feed/"), false);
});

test("proxy targets require HTTPS and an allowlisted public host", () => {
  assert.equal(isAllowedProxyTarget("https://yozm.wishket.com/magazine/feed/"), true);
  assert.equal(isAllowedProxyTarget("http://yozm.wishket.com/magazine/feed/"), false);
  assert.equal(isAllowedProxyTarget("https://example.com/feed.xml"), false);
  assert.equal(isAllowedProxyTarget("https://user@yozm.wishket.com/feed.xml"), false);
  assert.equal(isAllowedProxyTarget("https://yozm.wishket.com:8443/feed.xml"), false);
});

test("the preview smoke target is a single explicit public feed URL", () => {
  const previousTarget = process.env.RSS_PROXY_TEST_TARGET_URL;
  process.env.RSS_PROXY_TEST_TARGET_URL = "https://techgotgan.techgotgan.workers.dev/feed.xml";
  try {
    assert.equal(isAllowedProxyTarget("https://techgotgan.techgotgan.workers.dev/feed.xml"), true);
    assert.equal(isAllowedProxyTarget("https://techgotgan.techgotgan.workers.dev/api/rss-proxy"), false);
    assert.equal(isAllowedProxyTarget("https://example.com/feed.xml"), false);
  } finally {
    if (previousTarget === undefined) delete process.env.RSS_PROXY_TEST_TARGET_URL;
    else process.env.RSS_PROXY_TEST_TARGET_URL = previousTarget;
  }
});

test("proxy URLs carry a bearer token only when the URL targets the configured proxy", () => {
  const previousUrl = process.env.RSS_PROXY_URL;
  const previousToken = process.env.RSS_PROXY_TOKEN;
  process.env.RSS_PROXY_URL = "https://techgotgan.example.workers.dev/api/rss-proxy";
  process.env.RSS_PROXY_TOKEN = "test-proxy-token";
  try {
    const proxied = getProxiedUrl("https://yozm.wishket.com/magazine/feed/");
    assert.equal(new URL(proxied).pathname, "/api/rss-proxy");
    assert.deepEqual(getProxyAuthorizationHeaders(proxied), { Authorization: "Bearer test-proxy-token" });
    assert.deepEqual(getProxyFetchOptions(proxied), {
      headers: { Authorization: "Bearer test-proxy-token" },
      redirect: "manual",
    });
    assert.deepEqual(getProxyAuthorizationHeaders("https://yozm.wishket.com/magazine/feed/"), {});
    assert.deepEqual(getProxyAuthorizationHeaders("https://techgotgan.example.workers.dev/api/rss-proxy.evil"), {});
  } finally {
    if (previousUrl === undefined) delete process.env.RSS_PROXY_URL;
    else process.env.RSS_PROXY_URL = previousUrl;
    if (previousToken === undefined) delete process.env.RSS_PROXY_TOKEN;
    else process.env.RSS_PROXY_TOKEN = previousToken;
  }
});

test("the proxy uses a site-specific user agent for Woowahan and the normal ingestion agent elsewhere", () => {
  assert.equal(getProxyUpstreamUserAgent("https://techblog.woowahan.com/feed/"), RSS_PROXY_USER_AGENT);
  assert.equal(getProxyUpstreamUserAgent("https://yozm.wishket.com/magazine/feed/"), INGESTION_USER_AGENT);
});
