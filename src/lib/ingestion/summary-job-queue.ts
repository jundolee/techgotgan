import type { SupabaseClient } from "@supabase/supabase-js";
import { ARTICLE_SUMMARY_PROMPT_VERSION } from "./article-summary";

export function getSummaryQueueCandidateIds(
  existingArticleIds: readonly string[],
  insertedArticleIds: readonly string[],
): string[] {
  return [...new Set([...existingArticleIds, ...insertedArticleIds].filter(Boolean))];
}

export function getRecentSummaryRetryIds(
  articles: readonly { id: string; discovered_at: string | null }[],
  now = Date.now(),
  maxAgeMs = 24 * 60 * 60 * 1000,
): string[] {
  const cutoff = now - maxAgeMs;
  return [...new Set(articles.filter((article) => {
    if (!article.discovered_at) return false;
    const discoveredAt = Date.parse(article.discovered_at);
    return Number.isFinite(discoveredAt) && discoveredAt >= cutoff && discoveredAt <= now;
  }).map(({ id }) => id).filter(Boolean))];
}

export async function enqueuePendingSummaryJobs(
  client: SupabaseClient,
  articleIds: readonly string[],
): Promise<number> {
  const uniqueIds = getSummaryQueueCandidateIds(articleIds, []);
  if (uniqueIds.length === 0) return 0;

  const { error } = await client.from("article_summary_jobs").upsert(
    uniqueIds.map((articleId) => ({
      article_id: articleId,
      prompt_version: ARTICLE_SUMMARY_PROMPT_VERSION,
      status: "pending",
    })),
    { onConflict: "article_id,prompt_version", ignoreDuplicates: true },
  );
  if (error) throw error;
  return uniqueIds.length;
}
