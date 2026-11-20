export const ARTICLE_LOOKUP_BATCH_SIZE = 50;
export const MAX_ARTICLE_LOOKUP_URL_LENGTH = 7_000;

export interface ArticleLookupItem {
  article: { dedupKey: string };
  canonicalUrl: string;
}

export interface ArticleLookupBatchPlan<T> {
  batches: T[][];
  oversized: T[];
}

function inFilter(values: readonly string[]): string {
  const cleanedValues = Array.from(new Set(values))
    .map((value) => /[,()]/.test(value) ? `"${value}"` : value)
    .join(",");
  return `in.(${cleanedValues})`;
}

export function getArticleLookupRequestUrlLength(
  items: readonly ArticleLookupItem[],
  supabaseUrl: string,
  sourceId: string,
): number {
  const baseUrl = supabaseUrl.trim().replace(/\/+$/, "");
  const dedupUrl = new URL(`${baseUrl}/rest/v1/articles`);
  dedupUrl.searchParams.set("select", "id,dedup_key,discovered_at");
  dedupUrl.searchParams.set("source_id", `eq.${sourceId}`);
  dedupUrl.searchParams.set("dedup_key", inFilter(items.map(({ article }) => article.dedupKey)));

  const canonicalUrl = new URL(`${baseUrl}/rest/v1/articles`);
  canonicalUrl.searchParams.set("select", "id,canonical_url,discovered_at");
  canonicalUrl.searchParams.set("canonical_url", inFilter(items.map(({ canonicalUrl }) => canonicalUrl)));

  return Math.max(dedupUrl.toString().length, canonicalUrl.toString().length);
}

export function createArticleLookupBatches<T extends ArticleLookupItem>(
  items: readonly T[],
  supabaseUrl: string,
  sourceId: string,
): ArticleLookupBatchPlan<T> {
  const batches: T[][] = [];
  const oversized: T[] = [];
  let batch: T[] = [];

  for (const item of items) {
    const itemUrlLength = getArticleLookupRequestUrlLength([item], supabaseUrl, sourceId);
    if (itemUrlLength > MAX_ARTICLE_LOOKUP_URL_LENGTH) {
      if (batch.length > 0) batches.push(batch);
      batch = [];
      oversized.push(item);
      continue;
    }

    const candidate = [...batch, item];
    const exceedsItemLimit = candidate.length > ARTICLE_LOOKUP_BATCH_SIZE;
    const exceedsUrlLimit = getArticleLookupRequestUrlLength(candidate, supabaseUrl, sourceId) > MAX_ARTICLE_LOOKUP_URL_LENGTH;

    if (batch.length > 0 && (exceedsItemLimit || exceedsUrlLimit)) {
      batches.push(batch);
      batch = [item];
    } else {
      batch = candidate;
    }

  }

  if (batch.length > 0) batches.push(batch);
  return { batches, oversized };
}
