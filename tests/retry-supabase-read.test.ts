import assert from "node:assert/strict";
import test from "node:test";
import { readWithTransientSupabaseRetry } from "../src/lib/ingestion/retry-supabase-read";

test("retries a transient Supabase fetch failure and returns the read result", async () => {
  let attempts = 0;
  const delays: number[] = [];
  const rows = await readWithTransientSupabaseRetry(
    async () => {
      attempts += 1;
      return attempts === 1
        ? { data: null, error: new TypeError("fetch failed") }
        : { data: [{ id: "article-1" }], error: null };
    },
    "Read article candidates",
    async (milliseconds) => { delays.push(milliseconds); },
  );

  assert.deepEqual(rows, [{ id: "article-1" }]);
  assert.equal(attempts, 2);
  assert.deepEqual(delays, [500]);
});

test("does not retry a non-transient Supabase query error", async () => {
  let attempts = 0;

  await assert.rejects(
    () => readWithTransientSupabaseRetry(
      async () => {
        attempts += 1;
        return { data: null, error: { code: "42501", message: "permission denied" } };
      },
      "Read article candidates",
      async () => { throw new Error("unexpected retry"); },
    ),
    /Read article candidates: 42501: permission denied/,
  );

  assert.equal(attempts, 1);
});

test("retries a thrown transport error and reports it after exhausting retries", async () => {
  let attempts = 0;
  const delays: number[] = [];

  await assert.rejects(
    () => readWithTransientSupabaseRetry(
      async () => {
        attempts += 1;
        throw new TypeError("fetch failed");
      },
      "Read article candidates",
      async (milliseconds) => { delays.push(milliseconds); },
    ),
    /Read article candidates: fetch failed/,
  );

  assert.equal(attempts, 4);
  assert.deepEqual(delays, [500, 1_500, 3_000]);
});
