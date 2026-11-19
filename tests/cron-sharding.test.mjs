import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CRON_SHARD_COUNT, kstDayStart, sourceShard } from "../src/lib/ingestion/cron-sharding.ts";
import { getIngestionSweepPlan } from "../scripts/ingestion-sweep-plan.ts";

test("every source has one stable shard in the configured range", () => {
  const seen = new Set();
  for (let index = 0; index < 1000; index++) {
    const id = `source-${index}`;
    const shard = sourceShard(id);
    assert.equal(shard, sourceShard(id));
    assert.ok(shard >= 0 && shard < CRON_SHARD_COUNT);
    seen.add(shard);
    assert.equal(Array.from({ length: CRON_SHARD_COUNT }, (_, candidate) => candidate)
      .filter((candidate) => candidate === shard).length, 1);
  }
  assert.equal(seen.size, CRON_SHARD_COUNT);
});

test("KST day starts at 15:00 UTC on the previous calendar day", () => {
  assert.equal(kstDayStart(new Date("2026-09-22T14:59:59Z")), "2026-09-21T15:00:00.000Z");
  assert.equal(kstDayStart(new Date("2026-09-22T15:00:00Z")), "2026-09-22T15:00:00.000Z");
});

test("GitHub Actions schedules every ingestion shard and keeps the retry sweep", () => {
  const workflow = readFileSync(new URL("../.github/workflows/techgotgan-maintenance.yml", import.meta.url), "utf8");
  const first = getIngestionSweepPlan("first");
  const retry = getIngestionSweepPlan("retry");

  assert.equal(first.shards.length, CRON_SHARD_COUNT);
  assert.equal(retry.shards.length, CRON_SHARD_COUNT);
  assert.deepEqual(first.shards, Array.from({ length: CRON_SHARD_COUNT }, (_, index) => index));
  assert.equal(first.delayBetweenShards, 180_000);
  assert.equal(retry.delayBetweenShards, 60_000);
  assert.match(workflow, /cron: "15 22 \* \* \*"/);
  assert.match(workflow, /cron: "15 23 \* \* \*"/);
  assert.match(workflow, /cron: "45 23 \* \* \*"/);
  assert.match(workflow, /cron: "45 5 \* \* \*"/);
  assert.match(workflow, /cron: "45 11 \* \* \*"/);
  assert.match(workflow, /cron: "45 17 \* \* \*"/);
  assert.match(workflow, /cron: "15 0 \* \* \*"/);
  assert.match(workflow, /cron: "30 0 \* \* \*"/);
  const installAndSelect = workflow.split("      - run: npm ci")[1].split("      - name: Run first ingestion sweep")[0];
  assert.doesNotMatch(installAndSelect, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|PINECONE_API_KEY/);
  const ingestionSteps = workflow.split("      - name: Run first ingestion sweep")[1].split("      - name: Run summary worker")[0];
  assert.doesNotMatch(ingestionSteps, /OPENAI_API_KEY/);
  assert.match(ingestionSteps, /OPENAI_SUMMARY_ENABLED: \$\{\{ vars\.OPENAI_SUMMARY_ENABLED \|\| 'false' \}\}/);
  assert.match(ingestionSteps, /MIRROR_THUMBNAILS_ENABLED: "false"/);
  assert.match(workflow, /SUPABASE_SECRET_KEY: \$\{\{ secrets\.SUPABASE_SECRET_KEY \}\}/);
  assert.match(workflow, /OPENAI_SUMMARY_ENABLED: "true"/);
  assert.match(workflow, /steps\.select-task\.outputs\.task == 'summaries' && vars\.OPENAI_SUMMARY_ENABLED == 'true'/);
  assert.match(workflow, /steps\.select-task\.outputs\.task == 'indexnow' && vars\.INDEXNOW_ENABLED == 'true'/);
  assert.match(workflow, /cleanup-thumbnails/);
  assert.match(workflow, /cleanup-thumbnails-audit/);
  assert.match(workflow, /inspect-source-errors/);
  assert.match(workflow, /SOURCE_DIAGNOSTIC_IDS: "d489e2a3-d227-4bf0-ab1d-894cb8eac51a/);
  assert.match(workflow, /ORPHAN_THUMBNAIL_EXPECTED_COUNT: "214"/);
  assert.match(workflow, /ORPHAN_THUMBNAIL_EXPECTED_DIGEST: \$\{\{ vars\.ORPHAN_THUMBNAIL_EXPECTED_DIGEST \}\}/);
  assert.match(workflow, /ORPHAN_THUMBNAIL_EXPECTED_INVENTORY_DIGEST: \$\{\{ vars\.ORPHAN_THUMBNAIL_EXPECTED_INVENTORY_DIGEST \}\}/);
  assert.match(workflow, /ORPHAN_THUMBNAIL_DRY_RUN: "true"/);
  assert.match(workflow, /npm run cleanup:orphan-thumbnails/);
  assert.match(workflow, /--proto '=https' --proto-redir '=https'/);
  const vercelConfig = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal("crons" in vercelConfig, false);
});
