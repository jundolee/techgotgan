import assert from "node:assert/strict";
import test from "node:test";
import { collectArticleLookupResults } from "../src/lib/ingestion/article-lookup-results";

test("cross-source canonical matches do not claim another source's dedup key", () => {
  const match = {
    id: "article-from-source-b",
    source_id: "source-b",
    dedup_key: "guid:42",
    canonical_url: "https://example.com/shared",
    discovered_at: "2026-11-20T00:00:00Z",
  };

  const results = collectArticleLookupResults([match], "source-a");

  assert.equal(results.dedupKeys.has("guid:42"), false);
  assert.equal(results.canonicalUrls.has("https://example.com/shared"), true);
  assert.equal(results.summaryCandidates.get("article-from-source-b"), match.discovered_at);
});
