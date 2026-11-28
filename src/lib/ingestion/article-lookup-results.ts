export interface ArticleLookupRpcRow {
  id: string;
  source_id: string;
  dedup_key: string;
  canonical_url: string;
  discovered_at: string | null;
}

export function collectArticleLookupResults(rows: readonly ArticleLookupRpcRow[], sourceId: string) {
  const dedupKeys = new Set<string>();
  const canonicalUrls = new Set<string>();
  const summaryCandidates = new Map<string, string | null>();

  for (const row of rows) {
    if (row.source_id === sourceId) dedupKeys.add(row.dedup_key);
    canonicalUrls.add(row.canonical_url);
    summaryCandidates.set(row.id, row.discovered_at);
  }

  return { dedupKeys, canonicalUrls, summaryCandidates };
}
