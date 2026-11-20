export const ARTICLE_LOOKUP_BATCH_SIZE = 50;

export interface ArticleLookupItem {
  article: { dedupKey: string };
  canonicalUrl: string;
}

export function createArticleLookupBatches<T>(items: readonly T[]): T[][] {
  const batches: T[][] = [];
  for (let offset = 0; offset < items.length; offset += ARTICLE_LOOKUP_BATCH_SIZE) {
    batches.push(items.slice(offset, offset + ARTICLE_LOOKUP_BATCH_SIZE));
  }
  return batches;
}

export function createArticleLookupRpcParameters<T extends ArticleLookupItem>(
  sourceId: string,
  items: readonly T[],
): { p_source_id: string; p_dedup_keys: string[]; p_canonical_urls: string[] } {
  return {
    p_source_id: sourceId,
    p_dedup_keys: items.map(({ article }) => article.dedupKey),
    p_canonical_urls: items.map(({ canonicalUrl }) => canonicalUrl),
  };
}
