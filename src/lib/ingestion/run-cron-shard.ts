import { revalidatePath, revalidateTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestSource, type SourceRow } from "@/lib/ingestion/ingest-source";
import { kstDayStart } from "@/lib/ingestion/cron-sharding";
import {
  getIngestionErrorMessage,
  IngestionInfrastructureError,
  isIngestionInfrastructureFailure,
  sanitizeDiagnosticError,
} from "@/lib/ingestion/error-message";

type SourceWithCheck = SourceRow & { last_success_at: string | null };
type Client = ReturnType<typeof createServiceClient>;

const CONCURRENCY = 6;
const SOURCE_TIMEOUT_MS = 20_000;
// Leave room for the final 20-second source batch and status updates within maxDuration=60.
const TIME_BUDGET_MS = 30_000;
const PAGE_SIZE = 500;

interface SourceResult {
  sourceId: string;
  siteUrl: string;
  ok: boolean;
  found?: number;
  inserted?: number;
  error?: string;
  errorRecorded?: boolean;
  infrastructureFailure?: boolean;
}

async function ingestOne(client: Client, source: SourceWithCheck): Promise<SourceResult> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let sourceIngestCompleted = false;
  try {
    const result = await Promise.race([
      ingestSource(client, source),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new IngestionInfrastructureError(
          `Source operation timed out for ${source.id}`,
          new Error(`Timed out after ${SOURCE_TIMEOUT_MS} milliseconds`),
        )), SOURCE_TIMEOUT_MS);
      }),
    ]);
    sourceIngestCompleted = true;
    const checkedAt = new Date().toISOString();
    const { error } = await client.from("sources")
      .update({ last_checked_at: checkedAt, last_success_at: checkedAt, last_error: null })
      .eq("id", source.id)
      .select("id")
      .single();
    if (error) throw new Error(`Failed to record successful check: ${getIngestionErrorMessage(error)}`);
    return {
      sourceId: source.id,
      siteUrl: sanitizeDiagnosticError(source.site_url) ?? "[invalid URL]",
      ok: true,
      ...result,
    };
  } catch (cause) {
    const message = getIngestionErrorMessage(cause);
    let combined = message;
    let errorRecorded = false;
    try {
      const { error } = await client.from("sources")
        .update({ last_checked_at: new Date().toISOString(), last_error: message })
        .eq("id", source.id)
        .select("id")
        .single();
      if (error) combined += `; failed to record source error: ${getIngestionErrorMessage(error)}`;
      else errorRecorded = true;
    } catch (updateError) {
      combined += `; failed to record source error: ${getIngestionErrorMessage(updateError)}`;
    }
    const siteUrl = sanitizeDiagnosticError(source.site_url) ?? "[invalid URL]";
    console.error(`Cron ingestion failed for ${source.id} (${siteUrl}): ${combined}`);
    const infrastructureFailure = isIngestionInfrastructureFailure(cause, sourceIngestCompleted, errorRecorded);
    return { sourceId: source.id, siteUrl, ok: false, error: combined, errorRecorded, infrastructureFailure };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function runCronShard(shard: number, sweep: "first" | "retry"): Promise<Response> {
  const client = createServiceClient();
  const startedAt = Date.now();
  const todayStart = kstDayStart(new Date());
  const candidates: SourceWithCheck[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client.from("sources")
      .select("id, site_url, feed_url, feed_type, scrape_config, last_success_at")
      .eq("is_active", true)
      .eq("cron_shard", shard)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      const message = getIngestionErrorMessage(error);
      console.error(`Cron ${sweep} shard ${shard} source query failed: ${message}`);
      return Response.json({ ok: false, sweep, shard, error: message }, { status: 500 });
    }
    const page = (data ?? []) as SourceWithCheck[];
    candidates.push(...page.filter((source) =>
      !source.last_success_at || source.last_success_at < todayStart
    ));
    if (page.length < PAGE_SIZE) break;
  }

  const summaries: SourceResult[] = [];
  let next = 0;
  while (next < candidates.length && Date.now() - startedAt < TIME_BUDGET_MS) {
    const batch = candidates.slice(next, next + CONCURRENCY);
    summaries.push(...await Promise.all(batch.map((source) => ingestOne(client, source))));
    next += batch.length;
  }

  const totalInserted = summaries.reduce((acc, s) => acc + (s.inserted ?? 0), 0);
  if (totalInserted > 0) {
    try {
      revalidateTag("articles", "max");
      revalidatePath("/");
    } catch (revalidateErr) {
      console.warn("Revalidation error after cron ingest:", revalidateErr);
    }
  }

  const remaining = candidates.slice(next).map((source) => source.id);
  const failures = summaries.filter((summary) => !summary.ok);
  const recordedSourceFailures = failures.filter((summary) => summary.errorRecorded && !summary.infrastructureFailure).length;
  const infrastructureFailures = failures.filter((summary) => summary.infrastructureFailure).length;
  const ok = failures.length === 0 && remaining.length === 0;
  if (remaining.length) {
    console.error(`Cron ${sweep} shard ${shard} incomplete: ${remaining.length} sources were not attempted`);
  }
  return Response.json({
    ok, sweep, shard, todayStart, selected: candidates.length,
    attempted: summaries.length, succeeded: summaries.length - failures.length,
    failed: failures.length, recordedSourceFailures, infrastructureFailures, remaining, summaries,
  }, { status: ok ? 200 : 503 });
}
