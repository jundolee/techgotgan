import type { ArticleLookupItem } from "./article-lookup-batches";

export interface ExistingArticleLookupRow {
  id: string;
  dedup_key: string;
  canonical_url: string;
  discovered_at: string | null;
}

export async function readOversizedArticleMatches<T extends ArticleLookupItem>(
  candidates: readonly T[],
  fetchPage: (offset: number, pageSize: number) => Promise<readonly ExistingArticleLookupRow[]>,
  onMatch: (row: ExistingArticleLookupRow) => void,
  pageSize = 500,
): Promise<void> {
  const remainingCandidates = new Set(candidates);
  if (remainingCandidates.size === 0) return;

  let offset = 0;
  while (remainingCandidates.size > 0) {
    const page = await fetchPage(offset, pageSize);
    for (const row of page) {
      let matched = false;
      for (const candidate of remainingCandidates) {
        if (row.dedup_key === candidate.article.dedupKey || row.canonical_url === candidate.canonicalUrl) {
          remainingCandidates.delete(candidate);
          matched = true;
        }
      }
      if (matched) onMatch(row);
    }

    if (remainingCandidates.size === 0) return;
    if (page.length < pageSize) return;
    offset += page.length;
  }
}
