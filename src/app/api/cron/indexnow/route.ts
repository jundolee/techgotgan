import { SITE_URL } from "@/app/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const INDEXNOW_KEY = "fd1d51764a2688b02f4bba3f877b76ad";
const RECENT_CHANGE_WINDOW_MS = 24 * 60 * 60 * 1000;

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function getRecentlyChangedUrls(sitemap: string, now: number): string[] {
  const cutoff = now - RECENT_CHANGE_WINDOW_MS;
  const origin = new URL(SITE_URL).origin;

  return [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/gi)]
    .flatMap(([, entry]) => {
      const location = entry.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1];
      const lastModified = entry.match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1];
      if (!location || !lastModified) return [];

      const url = decodeXml(location.trim());
      const modifiedAt = Date.parse(decodeXml(lastModified.trim()));
      if (!Number.isFinite(modifiedAt) || modifiedAt < cutoff || modifiedAt > now) return [];

      try {
        return new URL(url).origin === origin ? [url] : [];
      } catch {
        return [];
      }
    })
    .slice(0, 10_000);
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let sitemapResponse: Response;
  try {
    sitemapResponse = await fetch(`${SITE_URL}/sitemap.xml`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("IndexNow sitemap fetch failed:", error);
    return Response.json({ ok: false, error: "sitemap-fetch-failed" }, { status: 502 });
  }

  if (!sitemapResponse.ok) {
    return Response.json(
      { ok: false, error: "sitemap-fetch-failed", status: sitemapResponse.status },
      { status: 502 }
    );
  }

  const sitemap = await sitemapResponse.text();
  const urlList = getRecentlyChangedUrls(sitemap, Date.now());
  if (urlList.length === 0) {
    return Response.json({ ok: true, submitted: 0, reason: "no-recently-changed-pages" });
  }

  let submission: Response;
  try {
    submission = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(SITE_URL).host, key: INDEXNOW_KEY, urlList }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("IndexNow submission failed:", error);
    return Response.json({ ok: false, error: "indexnow-submission-failed" }, { status: 502 });
  }

  if (!submission.ok) {
    return Response.json(
      { ok: false, error: "indexnow-rejected", status: submission.status, submitted: urlList.length },
      { status: 502 }
    );
  }

  return Response.json({ ok: true, submitted: urlList.length, status: submission.status });
}
