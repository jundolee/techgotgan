import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSupabaseServiceFetch } from "../src/lib/supabase/service-key-headers";
import type { FeedType, ScrapeConfig } from "../src/lib/ingestion/types";

const SOURCE_DIAGNOSTIC_ALLOWLIST = new Set([
  "d489e2a3-d227-4bf0-ab1d-894cb8eac51a",
  "ac45bdbc-c131-435f-8a84-d77baf96ea70",
  "36bb1622-50a9-4dd1-8524-192c11716224",
  "d7cedc18-30c3-4c37-98ce-4997972093eb",
]);

type SourceDiagnostic = {
  id: string;
  title: string | null;
  site_url: string;
  feed_url: string | null;
  feed_type: FeedType;
  scrape_config: ScrapeConfig | null;
  is_active: boolean;
  last_error: string | null;
};

export function parseSourceDiagnosticIds(value: string | undefined): string[] {
  const ids = [...new Set((value ?? "").split(",").map((id) => id.trim().toLowerCase()).filter(Boolean))];
  if (ids.length === 0 || ids.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))) {
    throw new Error("SOURCE_DIAGNOSTIC_IDS must contain one or more comma-separated UUIDs");
  }
  if (ids.some((id) => !SOURCE_DIAGNOSTIC_ALLOWLIST.has(id))) {
    throw new Error("SOURCE_DIAGNOSTIC_IDS contains a UUID outside the reviewed source allowlist");
  }
  return ids;
}

function sanitizeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return "[invalid URL]";
  }
}

export function sanitizeDiagnosticError(value: string | null): string | null {
  if (!value) return null;
  return value
    .replace(/https?:\/\/[^\s"'<>]+/gi, (match) => sanitizeUrl(match) ?? "[invalid URL]")
    .replace(/(authorization\s*:\s*bearer\s+)[^\s,;]+/gi, "$1[redacted]")
    .replace(/sb_secret_[A-Za-z0-9._~-]+/g, "sb_secret_[redacted]")
    .replace(/eyJ[A-Za-z0-9._-]{20,}/g, "[JWT redacted]");
}

export function formatSourceDiagnostics(sources: readonly SourceDiagnostic[]) {
  return sources.map(({ id, title, site_url, feed_url, feed_type, scrape_config, is_active, last_error }) => ({
    id,
    title,
    siteUrl: sanitizeUrl(site_url) ?? "[invalid URL]",
    feedUrl: sanitizeUrl(feed_url),
    feedType: feed_type,
    active: is_active,
    hasLastError: Boolean(last_error),
    lastError: sanitizeDiagnosticError(last_error),
    scrapeConfig: scrape_config ? {
      listItemSelector: scrape_config.listItemSelector,
      titleSelector: scrape_config.titleSelector,
      linkSelector: scrape_config.linkSelector ?? null,
      linkAttr: scrape_config.linkAttr ?? null,
      excerptSelector: scrape_config.excerptSelector ?? null,
      dateSelector: scrape_config.dateSelector ?? null,
      thumbnailSelector: scrape_config.thumbnailSelector ?? null,
      thumbnailAttr: scrape_config.thumbnailAttr ?? null,
      useBotUserAgent: scrape_config.useBotUserAgent ?? false,
    } : null,
  }));
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  const ids = parseSourceDiagnosticIds(process.env.SOURCE_DIAGNOSTIC_IDS);
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: createSupabaseServiceFetch(key) },
  });
  const { data, error } = await supabase.from("sources")
    .select("id,title,site_url,feed_url,feed_type,scrape_config,is_active,last_error")
    .in("id", ids)
    .order("id", { ascending: true });
  if (error) throw new Error(`Could not read source configuration: ${sanitizeDiagnosticError(error.message) ?? "Unknown error"}`);
  if (!Array.isArray(data)) throw new Error("Source diagnostics query returned no row array");
  console.log(JSON.stringify({ requested: ids.length, found: data.length, sources: formatSourceDiagnostics(data as SourceDiagnostic[]) }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(sanitizeDiagnosticError(error instanceof Error ? error.message : "Source diagnostics failed"));
    process.exitCode = 1;
  });
}
