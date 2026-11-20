export const ARTICLE_LOOKUP_BATCH_SIZE = 50;

export function createArticleLookupBatches<T>(items: readonly T[]): T[][] {
  const batches: T[][] = [];
  for (let offset = 0; offset < items.length; offset += ARTICLE_LOOKUP_BATCH_SIZE) {
    batches.push(items.slice(offset, offset + ARTICLE_LOOKUP_BATCH_SIZE));
  }
  return batches;
}
