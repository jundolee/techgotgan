import assert from "node:assert/strict";
import test from "node:test";
import { createArticleLookupBatches } from "../src/lib/ingestion/article-lookup-batches";

test("article lookup batches stay within the request limit without dropping candidates", () => {
  const candidates = Array.from({ length: 74 }, (_, index) => `article-${index}`);
  const batches = createArticleLookupBatches(candidates);

  assert.deepEqual(batches.map((batch) => batch.length), [50, 24]);
  assert.deepEqual(batches.flat(), candidates);
});

test("article lookup batching returns no empty requests", () => {
  assert.deepEqual(createArticleLookupBatches([]), []);
});
