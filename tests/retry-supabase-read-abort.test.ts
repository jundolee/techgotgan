import assert from "node:assert/strict";
import test from "node:test";
import { readWithTransientSupabaseRetry } from "../src/lib/ingestion/retry-supabase-read";

test("an aborted Supabase read does not start another retry", async () => {
  const controller = new AbortController();
  let attempts = 0;
  const delays: number[] = [];
  const abortReason = new Error("source deadline reached");

  await assert.rejects(
    readWithTransientSupabaseRetry(
      async () => {
        attempts += 1;
        controller.abort(abortReason);
        throw new TypeError("fetch failed");
      },
      "Read source articles",
      async (milliseconds) => { delays.push(milliseconds); },
      controller.signal,
    ),
    /source deadline reached/,
  );

  assert.equal(attempts, 1);
  assert.deepEqual(delays, []);
});

test("an abort cancels the pending Supabase retry delay", async () => {
  const controller = new AbortController();
  let attempts = 0;
  const startedAt = Date.now();
  const abortReason = new Error("source deadline reached");
  const pendingRead = readWithTransientSupabaseRetry(
    async () => {
      attempts += 1;
      return { data: null, error: new TypeError("fetch failed") };
    },
    "Read source articles",
    undefined,
    controller.signal,
  );

  setTimeout(() => controller.abort(abortReason), 10);

  await assert.rejects(pendingRead, /source deadline reached/);
  assert.equal(attempts, 1);
  assert.ok(Date.now() - startedAt < 200, "retry backoff should end when the signal aborts");
});
