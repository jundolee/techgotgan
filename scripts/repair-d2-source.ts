import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSupabaseServiceFetch } from "../src/lib/supabase/service-key-headers";
import type { ScrapeConfig } from "../src/lib/ingestion/types";

export const D2_SOURCE_ID = "d489e2a3-d227-4bf0-ab1d-894cb8eac51a";
export const D2_SITE_URL = "https://d2.naver.com/home";
export const D2_OLD_FEED_URL = "https://d2.naver.com/d2.atom";

export const D2_SCRAPE_CONFIG: ScrapeConfig = {
  listItemSelector: ".post_article",
  titleSelector: "h2 a",
  linkSelector: "h2 a",
  excerptSelector: "a.post_txt_wrap",
  dateSelector: "dl dd:first-of-type",
  thumbnailSelector: ".cont_img img",
  useBotUserAgent: true,
};

export type D2SourceRepairState = "ready" | "already-configured" | "unexpected";
export type D2SourceRepairRecord = {
  site_url: string;
  feed_url: string | null;
  feed_type: string;
  is_active: boolean;
  scrape_config: ScrapeConfig | null;
};

export function isD2ScrapeConfigMatch(config: ScrapeConfig | null): boolean {
  if (!config) return false;
  const expectedKeys = Object.keys(D2_SCRAPE_CONFIG).sort();
  const actualKeys = Object.keys(config).sort();
  return expectedKeys.length === actualKeys.length &&
    expectedKeys.every((key, index) => key === actualKeys[index] &&
      config[key as keyof ScrapeConfig] === D2_SCRAPE_CONFIG[key as keyof ScrapeConfig]);
}

export function getD2SourceRepairState(source: D2SourceRepairRecord): D2SourceRepairState {
  if (source.site_url !== D2_SITE_URL || !source.is_active) return "unexpected";
  if (source.feed_type === "scrape" && source.feed_url === null && isD2ScrapeConfigMatch(source.scrape_config)) {
    return "already-configured";
  }
  if (source.feed_type === "atom" && source.feed_url === D2_OLD_FEED_URL && source.scrape_config === null) {
    return "ready";
  }
  return "unexpected";
}

async function main() {
  if (process.env.SOURCE_REPAIR_APPROVED !== "true") {
    throw new Error("Set SOURCE_REPAIR_APPROVED=true only for the reviewed NAVER D2 repair");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: createSupabaseServiceFetch(key) },
  });
  const { data: current, error: readError } = await supabase.from("sources")
    .select("id,site_url,feed_url,feed_type,is_active,scrape_config")
    .eq("id", D2_SOURCE_ID)
    .maybeSingle();
  if (readError) throw new Error(`Could not verify NAVER D2 source: ${readError.code ?? "query error"}`);
  if (!current) {
    throw new Error("NAVER D2 source no longer matches the reviewed active record; refusing to update");
  }
  const repairState = getD2SourceRepairState(current as D2SourceRepairRecord);
  if (repairState === "already-configured") {
    console.log(JSON.stringify({ sourceId: D2_SOURCE_ID, repaired: false, alreadyConfigured: true }));
    return;
  }
  if (repairState !== "ready") {
    throw new Error("NAVER D2 feed settings changed since review; refusing to overwrite them");
  }

  const { data: updated, error: updateError } = await supabase.from("sources")
    .update({ feed_type: "scrape", feed_url: null, scrape_config: D2_SCRAPE_CONFIG })
    .eq("id", D2_SOURCE_ID)
    .eq("site_url", D2_SITE_URL)
    .eq("feed_type", "atom")
    .eq("feed_url", D2_OLD_FEED_URL)
    .eq("is_active", true)
    .is("scrape_config", null)
    .select("id,site_url,feed_url,feed_type,is_active,scrape_config")
    .maybeSingle();
  if (updateError) throw new Error(`Could not update NAVER D2 feed settings: ${updateError.code ?? "update error"}`);
  if (!updated) throw new Error("NAVER D2 feed settings changed during the repair; no row was updated");
  if (getD2SourceRepairState(updated as D2SourceRepairRecord) !== "already-configured") {
    throw new Error("NAVER D2 source did not retain the verified scrape configuration after update");
  }
  console.log(JSON.stringify({ sourceId: D2_SOURCE_ID, repaired: true, feedType: "scrape", sourceUrl: D2_SITE_URL }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "NAVER D2 source repair failed");
    process.exitCode = 1;
  });
}
