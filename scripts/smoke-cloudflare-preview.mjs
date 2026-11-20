import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SECRET_KEY?.trim();
const rssProxyUrl = process.env.RSS_PROXY_URL?.trim();
const rssProxyToken = process.env.RSS_PROXY_TOKEN?.trim();
if (!supabaseUrl || !supabaseKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required for this smoke check");
}
if (Boolean(rssProxyUrl) !== Boolean(rssProxyToken)) {
  throw new Error("RSS_PROXY_URL and RSS_PROXY_TOKEN must be configured together");
}

const httpsAgent = new HttpsAgent({ maxVersion: "TLSv1.2" });

function getRemoteProxyResponse(url) {
  return new Promise((resolveResponse, reject) => {
    const request = httpsRequest(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${rssProxyToken}` },
      agent: httpsAgent,
      timeout: 15_000,
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolveResponse({
        status: response.statusCode ?? 0,
        contentType: response.headers["content-type"] ?? "",
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    request.on("error", reject);
    request.end();
  });
}

const devVarsPath = resolve(".dev.vars");
if (existsSync(devVarsPath)) {
  throw new Error("Refusing to overwrite an existing .dev.vars file");
}

const port = process.env.CLOUDFLARE_PREVIEW_PORT?.trim() || "8790";
const origin = `http://127.0.0.1:${port}`;
let preview;
let persistPath;
let previewSpawnError;
const logs = [];
const rememberLog = (chunk) => {
  logs.push(String(chunk));
  while (logs.join("").length > 6000) logs.shift();
};

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (previewSpawnError) throw previewSpawnError;
    if (preview.exitCode !== null) throw new Error(`Preview exited early (${preview.exitCode})`);
    try {
      const response = await fetch(`${origin}/robots.txt`);
      if (response.ok) return;
    } catch {
      // The local Worker is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
  }
  throw new Error("Preview did not become ready within 60 seconds");
}

async function getJson(path) {
  const response = await fetch(`${origin}${path}`);
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

async function assertPage(path, expectedContentType) {
  let response;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(`${origin}${path}`);
    if (response.status < 500 || attempt === 2) break;
    console.warn(JSON.stringify({ check: "page-retry", path, status: response.status, attempt: attempt + 1 }));
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * (attempt + 1)));
  }
  if (response.status !== 200) throw new Error(`${path} returned HTTP ${response.status}`);
  if (expectedContentType && !response.headers.get("content-type")?.includes(expectedContentType)) {
    throw new Error(`${path} returned an unexpected content type`);
  }
  return response;
}

try {
  persistPath = await mkdtemp(resolve(tmpdir(), "techgotgan-cloudflare-preview-"));
  await writeFile(devVarsPath, [
    `NEXT_PUBLIC_SUPABASE_URL=${JSON.stringify(supabaseUrl)}`,
    `SUPABASE_SECRET_KEY=${JSON.stringify(supabaseKey)}`,
    "ADMIN_EMAILS=disabled@invalid.example",
    ...(rssProxyToken ? [`RSS_PROXY_TOKEN=${JSON.stringify(rssProxyToken)}`] : []),
    "",
  ].join("\n"), { encoding: "utf8", mode: 0o600 });
  preview = spawn(
    resolve("node_modules/.bin/opennextjs-cloudflare"),
    ["preview", "--port", port, "--persist-to", persistPath],
    { detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] },
  );
  preview.on("error", (error) => { previewSpawnError = error; });
  preview.stdout.on("data", rememberLog);
  preview.stderr.on("data", rememberLog);
  await waitForServer();

  for (const path of ["/", "/blogs", "/digest", "/topics", "/feed.xml"]) {
    await assertPage(path, path === "/feed.xml" ? "application/rss+xml" : "text/html");
    console.log(JSON.stringify({ check: "page", path, status: 200 }));
  }

  const onboardingImage = await assertPage("/onboarding/step2-ai-summary.png", "image/png");
  const onboardingImageBytes = await onboardingImage.arrayBuffer();
  if (onboardingImageBytes.byteLength < 10_000) {
    throw new Error("The onboarding summary screenshot was unexpectedly small");
  }
  console.log(JSON.stringify({ check: "onboarding-summary-image", status: 200, bytes: onboardingImageBytes.byteLength }));

  const sourcesResponse = await fetch(`${origin}/sources`, { redirect: "manual" });
  if (sourcesResponse.status !== 307 || !sourcesResponse.headers.get("location")?.includes("/login")) {
    throw new Error(`/sources was not protected by the configured admin email gate (HTTP ${sourcesResponse.status})`);
  }
  console.log(JSON.stringify({ check: "sources-admin-gate", status: sourcesResponse.status }));

  // The preview has production-capable Supabase credentials; never issue a POST that could mutate live rows.
  const backfillGet = await fetch(`${origin}/api/admin/backfill`, { redirect: "manual" });
  if (backfillGet.status !== 405 || backfillGet.headers.get("allow") !== "POST") {
    throw new Error(`/api/admin/backfill must not mutate data through GET (HTTP ${backfillGet.status})`);
  }
  console.log(JSON.stringify({ check: "admin-backfill-method", getStatus: backfillGet.status }));

  const deniedProxy = await fetch(`${origin}/api/rss-proxy?url=${encodeURIComponent("https://yozm.wishket.com/magazine/feed/")}`);
  if (deniedProxy.status !== 404) {
    throw new Error(`RSS proxy accepted a request without its token (HTTP ${deniedProxy.status})`);
  }
  if (rssProxyUrl && rssProxyToken) {
    const disallowedProxy = await fetch(`${origin}/api/rss-proxy?url=${encodeURIComponent("https://example.com/")}`, {
      headers: { Authorization: `Bearer ${rssProxyToken}` },
    });
    if (disallowedProxy.status !== 403) {
      throw new Error(`RSS proxy accepted a destination outside its allowlist (HTTP ${disallowedProxy.status})`);
    }

    const remoteUrl = new URL(rssProxyUrl.replace(/\/+$/, ""));
    remoteUrl.searchParams.set("url", "https://techblog.woowahan.com/feed/");
    const remoteFeed = await getRemoteProxyResponse(remoteUrl);
    if (remoteFeed.status !== 200 || !/xml/i.test(remoteFeed.contentType) || !/<rss[\s>]/i.test(remoteFeed.body.slice(0, 2_000))) {
      throw new Error(`Live RSS proxy did not return a valid Woowahan feed (HTTP ${remoteFeed.status})`);
    }
    console.log(JSON.stringify({ check: "rss-proxy", status: remoteFeed.status, contentType: remoteFeed.contentType.split(";")[0] }));
  }

  const [feed, publishers, weeks] = await Promise.all([
    getJson("/api/intoss/feed"),
    getJson("/api/intoss/publishers"),
    getJson("/api/intoss/digest/weeks"),
  ]);
  for (const [name, result] of [["feed", feed], ["publishers", publishers], ["digest-weeks", weeks]]) {
    if (!result.response.ok || !Array.isArray(result.body) || result.body.length === 0) {
      throw new Error(`${name} API failed its response check (HTTP ${result.response.status})`);
    }
    console.log(JSON.stringify({ check: name, status: result.response.status, count: result.body.length }));
  }

  const search = await fetch(`${origin}/api/intoss/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "React" }),
  });
  const searchRows = await search.json().catch(() => null);
  if (!search.ok || !Array.isArray(searchRows)) {
    throw new Error(`search API failed its response check (HTTP ${search.status})`);
  }
  console.log(JSON.stringify({ check: "search", status: search.status, count: searchRows.length }));

  const articleId = feed.body[0]?.id;
  if (typeof articleId !== "string") throw new Error("feed API returned no article ID");
  const detail = await getJson(`/api/intoss/articles/${encodeURIComponent(articleId)}`);
  if (!detail.response.ok || typeof detail.body?.title !== "string") {
    throw new Error(`article detail failed its response check (HTTP ${detail.response.status})`);
  }
  console.log(JSON.stringify({ check: "article-detail", status: detail.response.status }));
} catch (error) {
  const message = error instanceof Error ? error.message : "Cloudflare preview smoke check failed";
  console.error(message);
  const secret = process.env.SUPABASE_SECRET_KEY;
  const safeTail = logs.join("").slice(-1_500)
    .replaceAll(secret ?? "\0", "[redacted]")
    .replaceAll(rssProxyToken ?? "\0", "[redacted]")
    .replace(/sb_secret_[A-Za-z0-9._~-]+/g, "sb_secret_[redacted]")
    .replace(/eyJ[A-Za-z0-9._-]{20,}/g, "[JWT redacted]");
  if (safeTail) console.error(safeTail);
  process.exitCode = 1;
} finally {
  if (preview?.pid && preview.exitCode === null && preview.signalCode === null) {
    try {
      if (process.platform === "win32") preview.kill("SIGTERM");
      else process.kill(-preview.pid, "SIGTERM");
    } catch {
      // The preview may have exited between the state check and signal.
    }
    await new Promise((resolveExit) => preview.once("close", resolveExit));
  }
  await unlink(devVarsPath).catch(() => {});
  if (persistPath) await rm(persistPath, { recursive: true, force: true });
}
