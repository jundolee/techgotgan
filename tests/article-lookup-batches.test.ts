import assert from "node:assert/strict";
import test from "node:test";
import {
  createArticleLookupBatches,
  getArticleLookupRequestUrlLength,
  MAX_ARTICLE_LOOKUP_URL_LENGTH,
} from "../src/lib/ingestion/article-lookup-batches";

const supabaseUrl = "https://project.supabase.co";
const sourceId = "36bb1622-50a9-4dd1-8524-192c11716224";
const makeCandidate = (index: number, canonicalUrl = `https://example.com/posts/${index}`) => ({
  article: { dedupKey: `guid:${index}` },
  canonicalUrl,
});

test("article lookup batching caps item count without dropping candidates", () => {
  const candidates = Array.from({ length: 74 }, (_, index) => makeCandidate(index));
  const plan = createArticleLookupBatches(candidates, supabaseUrl, sourceId);

  assert.deepEqual(plan.batches.map((batch) => batch.length), [50, 24]);
  assert.deepEqual(plan.batches.flat(), candidates);
  assert.deepEqual(plan.oversized, []);
});

test("article lookup batching also respects serialized URI length for Unicode slugs", () => {
  const candidates = Array.from({ length: 74 }, (_, index) => makeCandidate(
    index,
    `https://example.com/posts/${"한글".repeat(10)}-${index}`,
  ));
  const plan = createArticleLookupBatches(candidates, supabaseUrl, sourceId);

  assert.ok(plan.batches.some((batch) => batch.length < 50));
  assert.deepEqual(plan.batches.flat(), candidates);
  assert.deepEqual(plan.oversized, []);
  for (const batch of plan.batches) {
    assert.ok(getArticleLookupRequestUrlLength(batch, supabaseUrl, sourceId) <= MAX_ARTICLE_LOOKUP_URL_LENGTH);
  }
});

test("one oversized article URL is isolated while normal candidates remain batched", () => {
  const candidates = [
    makeCandidate(1),
    makeCandidate(2, `https://example.com/${"a".repeat(8_000)}`),
    makeCandidate(3),
  ];
  const plan = createArticleLookupBatches(candidates, supabaseUrl, sourceId);

  assert.deepEqual(plan.batches.flat(), [candidates[0], candidates[2]]);
  assert.deepEqual(plan.oversized, [candidates[1]]);
});

test("article lookup batching returns no empty requests", () => {
  assert.deepEqual(createArticleLookupBatches([], supabaseUrl, sourceId), { batches: [], oversized: [] });
});
