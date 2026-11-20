/**
 * 우아한형제들 등 클라우드(AWS/Vercel) IP 대역을 WAF에서 차단(403)하는 사이트를 위해
 * Cloudflare Worker 등 외부 프록시 경유 URL을 생성하는 유틸리티.
 */
import { INGESTION_USER_AGENT, RSS_PROXY_USER_AGENT } from "./user-agent";

const BLOCKED_DOMAINS = [
  "techblog.woowahan.com",
  "medium.com",
  "techblog.uplus.co.kr",
  "techblog.gccompany.co.kr",
  "techblog.lotteon.com",
  "techblog.musinsa.com",
  "blog.kmong.com",
  "yozm.wishket.com",
];
// This harmless public feed is available only when the local smoke script explicitly sets the matching test variable.
const RSS_PROXY_SMOKE_FEED_URL = "https://techgotgan.techgotgan.workers.dev/feed.xml";

export function isBlockedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return BLOCKED_DOMAINS.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * RSS_PROXY_URL 환경변수가 설정되어 있는 경우, 대상 URL을 프록시를 경유하도록 래핑한다.
 * 설정되어 있지 않거나 이미 프록시가 적용된 경우 원본 URL을 그대로 반환한다.
 */
export function getProxiedUrl(targetUrl: string): string {
  const proxyBase = process.env.RSS_PROXY_URL?.trim().replace(/\/+$/, "");
  if (!proxyBase) return targetUrl;
  if (targetUrl.startsWith(proxyBase)) return targetUrl;
  return `${proxyBase}?url=${encodeURIComponent(targetUrl)}`;
}

export function isRssProxyUrl(requestUrl: string): boolean {
  const proxyBase = process.env.RSS_PROXY_URL?.trim().replace(/\/+$/, "");
  if (!proxyBase) return false;
  try {
    const target = new URL(requestUrl);
    const proxy = new URL(proxyBase);
    return target.protocol === "https:" && target.origin === proxy.origin &&
      (target.pathname === proxy.pathname || target.pathname.startsWith(`${proxy.pathname}/`));
  } catch {
    return false;
  }
}

export function getProxyAuthorizationHeaders(requestUrl: string): Record<string, string> {
  const token = process.env.RSS_PROXY_TOKEN?.trim();
  return token && isRssProxyUrl(requestUrl) ? { Authorization: `Bearer ${token}` } : {};
}

export function getProxyFetchOptions(requestUrl: string): {
  headers: Record<string, string>;
  redirect: "manual";
} {
  if (!isRssProxyUrl(requestUrl)) {
    throw new Error("Authenticated RSS proxy requests must target the configured HTTPS endpoint");
  }
  return { headers: getProxyAuthorizationHeaders(requestUrl), redirect: "manual" };
}

export function isAllowedProxyTarget(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.hash || url.port) return false;
    const normalizedUrl = url.toString();
    const smokeTarget = process.env.RSS_PROXY_TEST_TARGET_URL?.trim();
    const isSmokeTarget = smokeTarget === RSS_PROXY_SMOKE_FEED_URL && normalizedUrl === RSS_PROXY_SMOKE_FEED_URL;
    return isBlockedDomain(normalizedUrl) || isSmokeTarget;
  } catch {
    return false;
  }
}

export function getProxyUpstreamUserAgent(targetUrl: string): string {
  try {
    if (new URL(targetUrl).hostname === "techblog.woowahan.com") {
      return RSS_PROXY_USER_AGENT;
    }
  } catch {}
  return INGESTION_USER_AGENT;
}

/**
 * https:// URL을 http:// URL로 변환한다 (SSL 인증서 발급 지연 시 폴백용).
 */
export function toHttpUrl(url: string): string | null {
  if (url.startsWith("https://")) {
    return url.replace(/^https:\/\//, "http://");
  }
  return null;
}

/**
 * SSL/TLS 핸드셰이크 관련 오류인지 판별한다.
 */
export function isSslError(err: unknown): boolean {
  const msg = String(err);
  return (
    msg.includes("SSL") ||
    msg.includes("EPROTO") ||
    msg.includes("handshake failure") ||
    msg.includes("CERT") ||
    msg.includes("UND_ERR_SOCKET") ||
    msg.includes("other side closed")
  );
}

