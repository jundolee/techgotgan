import assert from "node:assert/strict";
import test from "node:test";
import { createArticleLookupBatches, createArticleLookupRpcParameters } from "../src/lib/ingestion/article-lookup-batches";

const sourceId = "36bb1622-50a9-4dd1-8524-192c11716224";
const makeCandidate = (index: number, canonicalUrl = `https://example.com/posts/${index}`) => ({
  article: { dedupKey: `guid:${index}` },
  canonicalUrl,
});

test("article lookup batching caps item count without dropping candidates", () => {
  const candidates = Array.from({ length: 74 }, (_, index) => makeCandidate(index));
  const batches = createArticleLookupBatches(candidates);

  assert.deepEqual(batches.map((batch) => batch.length), [50, 24]);
  assert.deepEqual(batches.flat(), candidates);
});

test("article lookup RPC parameters preserve long Unicode canonical URLs", () => {
  const candidates = Array.from({ length: 74 }, (_, index) => makeCandidate(
    index,
    `https://example.com/posts/${"한글".repeat(10)}-${index}`,
  ));
  const batches = createArticleLookupBatches(candidates);
  const params = createArticleLookupRpcParameters(sourceId, batches[0]);

  assert.equal(params.p_source_id, sourceId);
  assert.deepEqual(params.p_dedup_keys, batches[0].map(({ article }) => article.dedupKey));
  assert.deepEqual(params.p_canonical_urls, batches[0].map(({ canonicalUrl }) => canonicalUrl));
  assert.ok(params.p_canonical_urls[0].includes("한글"));
});

test("article lookup batching returns no empty requests", () => {
  assert.deepEqual(createArticleLookupBatches([]), []);
});
