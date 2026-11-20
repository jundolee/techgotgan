import assert from "node:assert/strict";
import test from "node:test";
import { readOversizedArticleMatches, type ExistingArticleLookupRow } from "../src/lib/ingestion/oversized-article-lookup";

test("oversized article lookups page source rows and recover duplicate IDs for summary retries", async () => {
  const candidates = [
    { article: { dedupKey: "guid:existing" }, canonicalUrl: "https://example.com/new-path" },
    { article: { dedupKey: "guid:other" }, canonicalUrl: "https://example.com/other" },
  ];
  const pages: ExistingArticleLookupRow[][] = [
    [{ id: "article-1", dedup_key: "guid:existing", canonical_url: "https://example.com/old-path", discovered_at: null }],
    [{ id: "article-2", dedup_key: "guid:unused", canonical_url: "https://example.com/other", discovered_at: "2026-11-20T00:00:00Z" }],
  ];
  const offsets: number[] = [];
  const matches: ExistingArticleLookupRow[] = [];

  await readOversizedArticleMatches(
    candidates,
    async (offset, pageSize) => {
      offsets.push(offset);
      assert.equal(pageSize, 1);
      return pages.shift() ?? [];
    },
    (row) => matches.push(row),
    1,
  );

  assert.deepEqual(offsets, [0, 1]);
  assert.deepEqual(matches.map(({ id }) => id), ["article-1", "article-2"]);
});

test("oversized article lookup stops after a short page when nothing matches", async () => {
  let calls = 0;
  await readOversizedArticleMatches(
    [{ article: { dedupKey: "guid:missing" }, canonicalUrl: "https://example.com/missing" }],
    async () => {
      calls += 1;
      return [];
    },
    () => assert.fail("No rows should match"),
    500,
  );

  assert.equal(calls, 1);
});
