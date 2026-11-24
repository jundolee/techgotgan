import "server-only";
import { ingestSource, type SourceRow } from "./ingest-source";
import { getIngestionErrorMessage } from "./error-message";
import { createServiceClient } from "@/lib/supabase/service";

export interface IngestSourceNowResult {
  ok: boolean;
  message: string;
  inserted?: number;
}

/** Run one source and persist its result without triggering Next cache revalidation. */
export async function ingestSourceById(id: string): Promise<IngestSourceNowResult> {
  if (!id) return { ok: false, message: "잘못된 요청입니다." };

  const checkedAt = new Date().toISOString();
  let supabase: ReturnType<typeof createServiceClient> | null = null;

  try {
    supabase = createServiceClient();
    const { data: source, error } = await supabase
      .from("sources")
      .select("id, site_url, feed_url, feed_type, scrape_config")
      .eq("id", id)
      .single();

    if (error) throw new Error(`Read source for ingestion: ${getIngestionErrorMessage(error)}`);
    if (!source) return { ok: false, message: "소스를 찾을 수 없습니다." };

    const result = await ingestSource(supabase, source as SourceRow);
    const { error: updateError } = await supabase
      .from("sources")
      .update({ last_checked_at: checkedAt, last_success_at: checkedAt, last_error: null })
      .eq("id", id);
    if (updateError) {
      throw new Error(`Record successful source check: ${getIngestionErrorMessage(updateError)}`);
    }

    return {
      ok: true,
      message:
        result.inserted > 0
          ? `새 글 ${result.inserted}개를 가져왔어요.`
          : "확인했지만 새 글은 없었어요.",
      inserted: result.inserted,
    };
  } catch (cause) {
    const message = getIngestionErrorMessage(cause);
    if (supabase) {
      try {
        const { error } = await supabase
          .from("sources")
          .update({ last_checked_at: checkedAt, last_error: message })
          .eq("id", id);
        if (error) console.error(`Could not record source ingestion error for ${id}:`, error);
      } catch (recordError) {
        console.error(`Could not record source ingestion error for ${id}:`, recordError);
      }
    }
    console.error(`Immediate source ingestion failed for ${id}:`, message);
    return { ok: false, message: "수집에 실패했어요." };
  }
}
