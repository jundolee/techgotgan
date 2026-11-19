import assert from "node:assert/strict";
import { test } from "node:test";
import { runSummaryJobs, summarizeArticlesDirect } from "../src/lib/ingestion/run-summary-jobs";
import { isArticleSummaryEnabled, isArticleSummaryQueueEnabled } from "../src/lib/ingestion/article-summary";
import {
  enqueuePendingSummaryJobs,
  getRecentSummaryRetryIds,
  getSummaryQueueCandidateIds,
} from "../src/lib/ingestion/summary-job-queue";
import type { SupabaseClient } from "@supabase/supabase-js";

test("summarizeArticlesDirect returns zero counts when given empty article array", async () => {
  const result = await summarizeArticlesDirect([]);
  assert.deepEqual(result, { ready: 0, unavailable: 0, failed: 0 });
});

test("isArticleSummaryEnabled is false when OPENAI_SUMMARY_ENABLED is unset or not true", () => {
  const prevEnabled = process.env.OPENAI_SUMMARY_ENABLED;
  const prevKey = process.env.OPENAI_API_KEY;
  try {
    delete process.env.OPENAI_SUMMARY_ENABLED;
    assert.equal(isArticleSummaryEnabled(), false);

    process.env.OPENAI_SUMMARY_ENABLED = "false";
    assert.equal(isArticleSummaryEnabled(), false);

    process.env.OPENAI_SUMMARY_ENABLED = "true";
    delete process.env.OPENAI_API_KEY;
    assert.equal(isArticleSummaryEnabled(), false);
  } finally {
    if (prevEnabled !== undefined) process.env.OPENAI_SUMMARY_ENABLED = prevEnabled;
    else delete process.env.OPENAI_SUMMARY_ENABLED;
    if (prevKey !== undefined) process.env.OPENAI_API_KEY = prevKey;
    else delete process.env.OPENAI_API_KEY;
  }
});

test("summary queue can be enabled without exposing an OpenAI key to ingestion", () => {
  const previousEnabled = process.env.OPENAI_SUMMARY_ENABLED;
  const previousKey = process.env.OPENAI_API_KEY;
  try {
    process.env.OPENAI_SUMMARY_ENABLED = "true";
    delete process.env.OPENAI_API_KEY;
    assert.equal(isArticleSummaryQueueEnabled(), true);
    assert.equal(isArticleSummaryEnabled(), false);
  } finally {
    if (previousEnabled === undefined) delete process.env.OPENAI_SUMMARY_ENABLED;
    else process.env.OPENAI_SUMMARY_ENABLED = previousEnabled;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("new article summary jobs are queued as pending without calling an AI provider", async () => {
  let table = "";
  let rows: unknown;
  let options: unknown;
  const fakeClient = {
    from(name: string) {
      table = name;
      return {
        async upsert(values: unknown, config: unknown) {
          rows = values;
          options = config;
          return { error: null };
        },
      };
    },
  } as unknown as SupabaseClient;

  const count = await enqueuePendingSummaryJobs(fakeClient, ["article-1", "article-2", "article-1"]);
  assert.equal(count, 2);
  assert.equal(table, "article_summary_jobs");
  assert.deepEqual(rows, [
    { article_id: "article-1", prompt_version: "2026-10-22-plain-korean-v1", status: "pending" },
    { article_id: "article-2", prompt_version: "2026-10-22-plain-korean-v1", status: "pending" },
  ]);
  assert.deepEqual(options, { onConflict: "article_id,prompt_version", ignoreDuplicates: true });
});

test("summary queue retries recover a committed article after the first upsert fails", async () => {
  const jobs = new Map<string, { article_id: string; prompt_version: string; status: string }>();
  let attempts = 0;
  const fakeClient = {
    from() {
      return {
        async upsert(rows: Array<{ article_id: string; prompt_version: string; status: string }>) {
          attempts += 1;
          if (attempts === 1) return { error: new Error("temporary queue failure") };
          for (const row of rows) {
            if (!jobs.has(row.article_id)) jobs.set(row.article_id, row);
          }
          return { error: null };
        },
      };
    },
  } as unknown as SupabaseClient;
  const now = Date.parse("2026-11-19T12:00:00.000Z");
  const retryIds = getSummaryQueueCandidateIds(getRecentSummaryRetryIds([
    { id: "article-inserted-before-failure", discovered_at: "2026-11-19T11:30:00.000Z" },
    { id: "older-feed-article", discovered_at: "2026-11-17T12:00:00.000Z" },
  ], now), []);

  await assert.rejects(enqueuePendingSummaryJobs(fakeClient, retryIds), /temporary queue failure/);
  await enqueuePendingSummaryJobs(fakeClient, retryIds);
  await enqueuePendingSummaryJobs(fakeClient, retryIds);

  assert.equal(attempts, 3);
  assert.equal(jobs.size, 1);
  assert.equal(jobs.has("older-feed-article"), false);
  assert.deepEqual([...jobs.values()], [{
    article_id: "article-inserted-before-failure",
    prompt_version: "2026-10-22-plain-korean-v1",
    status: "pending",
  }]);
});

test("enabled summary worker reaches the database queue claim RPC", async () => {
  const previousEnabled = process.env.OPENAI_SUMMARY_ENABLED;
  const previousKey = process.env.OPENAI_API_KEY;
  let claimArgs: unknown;
  const updateChain = {
    eq() { return updateChain; },
    async neq() { return { error: null }; },
  };
  const fakeClient = {
    from() {
      return { update() { return updateChain; } };
    },
    async rpc(name: string, args: unknown) {
      assert.equal(name, "claim_article_summary_jobs_by_version");
      claimArgs = args;
      return { data: [], error: null };
    },
  };

  try {
    process.env.OPENAI_SUMMARY_ENABLED = "true";
    process.env.OPENAI_API_KEY = "test-key-not-used-with-empty-queue";
    const result = await runSummaryJobs(1, fakeClient as unknown as Parameters<typeof runSummaryJobs>[1]);
    assert.deepEqual(result, { claimed: 0, ready: 0, unavailable: 0, failed: 0 });
    assert.deepEqual(claimArgs, { p_prompt_version: "2026-10-22-plain-korean-v1", p_limit: 1 });
  } finally {
    if (previousEnabled === undefined) delete process.env.OPENAI_SUMMARY_ENABLED;
    else process.env.OPENAI_SUMMARY_ENABLED = previousEnabled;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});
