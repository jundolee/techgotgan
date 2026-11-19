import assert from "node:assert/strict";
import { test } from "node:test";
import { createIntossHandler } from "../supabase/functions/techgotgan-intoss-api/handler";

const env = {
  SUPABASE_URL: "https://project-ref.supabase.co",
  SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_secret_server-only-test-key" }),
  APP_IN_TOSS_APP_NAME: "techgotgan",
};
const appOrigin = "https://techgotgan.apps.tossmini.com";

test("feed uses the new secret key only as apikey and returns public fields", async () => {
  let upstreamUrl = "";
  let upstreamHeaders = new Headers();
  const handler = createIntossHandler(env, (async (input, init) => {
    upstreamUrl = String(input);
    upstreamHeaders = new Headers(init?.headers);
    return Response.json([{
      id: "article-id",
      title: "Public post",
      category: null,
      tags: null,
      source: [{ id: "source-id", title: "Example", site_url: "https://example.com", favicon_url: null }],
    }]);
  }) as typeof fetch);

  const response = await handler(new Request("https://project-ref.supabase.co/functions/v1/techgotgan-intoss-api/feed", {
    headers: { origin: appOrigin },
  }));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), appOrigin);
  assert.equal(new URL(upstreamUrl).pathname, "/rest/v1/articles");
  assert.equal(new URL(upstreamUrl).searchParams.get("limit"), "100");
  assert.equal(upstreamHeaders.get("apikey"), "sb_secret_server-only-test-key");
  assert.equal(upstreamHeaders.get("authorization"), null);
  const [article] = await response.json() as Array<{ category: string; tags: string[]; source: { id: string } }>;
  assert.equal(article.category, "general");
  assert.deepEqual(article.tags, []);
  assert.equal(article.source.id, "source-id");
  assert.doesNotMatch(JSON.stringify(article), /sb_secret_server-only-test-key/);
});

test("legacy service-role JWT is sent as both apikey and bearer authorization", async () => {
  const legacyKey = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature";
  let upstreamHeaders = new Headers();
  const handler = createIntossHandler({
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: legacyKey,
    APP_IN_TOSS_APP_NAME: env.APP_IN_TOSS_APP_NAME,
  }, (async (_input, init) => {
    upstreamHeaders = new Headers(init?.headers);
    return Response.json([]);
  }) as typeof fetch);

  const response = await handler(new Request("https://project-ref.supabase.co/functions/v1/techgotgan-intoss-api/publishers"));

  assert.equal(response.status, 200);
  assert.equal(upstreamHeaders.get("apikey"), legacyKey);
  assert.equal(upstreamHeaders.get("authorization"), `Bearer ${legacyKey}`);
});

test("search validates length before calling the database", async () => {
  let upstreamCalled = false;
  const handler = createIntossHandler(env, (async () => {
    upstreamCalled = true;
    return Response.json([]);
  }) as typeof fetch);

  const response = await handler(new Request("https://project-ref.supabase.co/functions/v1/techgotgan-intoss-api/search", {
    method: "POST",
    headers: { origin: appOrigin, "content-type": "application/json" },
    body: JSON.stringify({ query: "x" }),
  }));

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("access-control-allow-origin"), appOrigin);
  assert.equal(upstreamCalled, false);
});

test("search maps the existing RPC result into the app article shape", async () => {
  let requestBody: unknown;
  const handler = createIntossHandler(env, (async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return Response.json([{
      id: "article-id",
      title: "TypeScript at work",
      url: "https://example.com/post",
      excerpt: null,
      thumbnail_url: null,
      published_at: null,
      click_count: 1,
      category: null,
      tags: null,
      source_id: "source-id",
      source_title: "Example",
      source_site_url: "https://example.com",
      source_favicon_url: null,
    }]);
  }) as typeof fetch);

  const response = await handler(new Request("https://project-ref.supabase.co/functions/v1/techgotgan-intoss-api/search", {
    method: "POST",
    headers: { origin: appOrigin, "content-type": "application/json" },
    body: JSON.stringify({ query: "TypeScript" }),
  }));
  const [article] = await response.json() as Array<{ category: string; tags: string[]; source: { id: string; title: string; site_url: string; favicon_url: string | null } }>;

  assert.equal(response.status, 200);
  assert.deepEqual(requestBody, { search_query: "TypeScript" });
  assert.equal(article.category, "general");
  assert.deepEqual(article.tags, []);
  assert.deepEqual(article.source, { id: "source-id", title: "Example", site_url: "https://example.com", favicon_url: null });
});

test("detail returns the selected public summary with the existing article contract", async () => {
  const articleId = "1f8e28c1-1e3e-456f-8ac4-0adf4e9df011";
  const handler = createIntossHandler(env, (async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/article_summary_jobs")) {
      return Response.json([{
        status: "ready",
        lead: "A **short lead**",
        key_points: ["Key point"],
        extraction_status: "supported",
        prompt_version: "2026-10-22-plain-korean-v1",
        generated_at: "2026-11-19T00:00:00.000Z",
      }]);
    }
    return Response.json([{
      id: articleId,
      title: "Public post",
      url: "https://example.com/post",
      excerpt: "Description",
      published_at: "2026-11-18T00:00:00.000Z",
      category: "frontend",
      tags: ["typescript"],
      source: { title: "Example" },
    }]);
  }) as typeof fetch);

  const response = await handler(new Request(`https://project-ref.supabase.co/functions/v1/techgotgan-intoss-api/articles/${articleId}`, {
    headers: { origin: appOrigin },
  }));
  const article = await response.json() as { summary: { lead: string; keyPoints: string[] }; summaryBasis: string; sourceTitle: string };

  assert.equal(response.status, 200);
  assert.equal(article.summary.lead, "A **short lead**");
  assert.deepEqual(article.summary.keyPoints, ["Key point"]);
  assert.equal(article.summaryBasis, "full_article");
  assert.equal(article.sourceTitle, "Example");
});

test("publisher directory returns only active publisher fields", async () => {
  let upstreamUrl = "";
  const handler = createIntossHandler(env, (async (input) => {
    upstreamUrl = String(input);
    return Response.json([{
      id: "source-id",
      title: "Example",
      site_url: "https://example.com",
      favicon_url: null,
      is_active: true,
      private_note: "never returned",
    }]);
  }) as typeof fetch);

  const response = await handler(new Request("https://project-ref.supabase.co/functions/v1/techgotgan-intoss-api/publishers", {
    headers: { origin: appOrigin },
  }));
  const publishers = await response.json() as Array<{ id: string; title: string; site_url: string; favicon_url: string | null }>;
  const query = new URL(upstreamUrl).searchParams;

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), appOrigin);
  assert.equal(new URL(upstreamUrl).pathname, "/rest/v1/sources");
  assert.equal(query.get("is_active"), "eq.true");
  assert.equal(query.get("select"), "id,title,site_url,favicon_url");
  assert.deepEqual(publishers, [{ id: "source-id", title: "Example", site_url: "https://example.com", favicon_url: null }]);
});

test("weekly digest archive groups articles into KST ISO weeks", async () => {
  let upstreamUrl = "";
  const handler = createIntossHandler(env, (async (input) => {
    upstreamUrl = String(input);
    return Response.json([
      { published_at: "2026-11-18T00:00:00.000Z", discovered_at: "2026-11-18T01:00:00.000Z" },
      { published_at: "2026-11-17T23:00:00.000Z", discovered_at: "2026-11-18T02:00:00.000Z" },
    ]);
  }) as typeof fetch);

  const response = await handler(new Request("https://project-ref.supabase.co/functions/v1/techgotgan-intoss-api/digest/weeks", {
    headers: { origin: appOrigin },
  }));
  const weeks = await response.json() as Array<{ week: string; articleCount: number; lastModified: string }>;
  const query = new URL(upstreamUrl).searchParams;

  assert.equal(response.status, 200);
  assert.equal(query.get("published_at"), "not.is.null");
  assert.equal(weeks[0].week, "2026-W47");
  assert.equal(weeks[0].articleCount, 2);
  assert.equal(weeks[0].lastModified, "2026-11-18T02:00:00.000Z");
});

test("weekly digest returns article and distribution data for a valid week", async () => {
  let upstreamUrl = "";
  const handler = createIntossHandler(env, (async (input) => {
    upstreamUrl = String(input);
    return Response.json([{
      id: "article-id",
      title: "Public post",
      url: "https://example.com/post",
      excerpt: "A public description",
      thumbnail_url: null,
      published_at: "2026-11-18T00:00:00.000Z",
      discovered_at: "2026-11-18T01:00:00.000Z",
      click_count: 4,
      category: "frontend",
      tags: ["react"],
      source: [{ id: "source-id", title: "Example", site_url: "https://example.com", favicon_url: null }],
    }]);
  }) as typeof fetch);

  const response = await handler(new Request("https://project-ref.supabase.co/functions/v1/techgotgan-intoss-api/digest/2026-W47", {
    headers: { origin: appOrigin },
  }));
  const digest = await response.json() as {
    week: string;
    articleCount: number;
    latestArticles: Array<{ id: string; source: { id: string } }>;
    categoryDistribution: Array<{ label: string; count: number }>;
    sourceDistribution: Array<{ label: string; count: number }>;
  };

  assert.equal(response.status, 200);
  assert.equal(new URL(upstreamUrl).pathname, "/rest/v1/articles");
  assert.equal(digest.week, "2026-W47");
  assert.equal(digest.articleCount, 1);
  assert.equal(digest.latestArticles[0].id, "article-id");
  assert.equal(digest.latestArticles[0].source.id, "source-id");
  assert.deepEqual(digest.categoryDistribution, [{ label: "Frontend", count: 1, percentage: 100 }]);
  assert.deepEqual(digest.sourceDistribution, [{ label: "Example", count: 1, percentage: 100 }]);
});

test("unknown App-in-Toss origins are rejected", async () => {
  const handler = createIntossHandler(env);
  const response = await handler(new Request("https://project-ref.supabase.co/functions/v1/techgotgan-intoss-api/feed", {
    headers: { origin: "https://unknown.apps.tossmini.com" },
  }));

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});
