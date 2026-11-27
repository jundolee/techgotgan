import { setTimeout as delay } from "node:timers/promises";
import { runCronShard } from "@/lib/ingestion/run-cron-shard";
import {
  getIngestionSweepPlan,
  isCompletedWithRecordedSourceFailures,
  isSuccessfulIngestionShardResult,
  shouldFailIngestionSweep,
  type IngestionShardResult,
} from "./ingestion-sweep-plan";

async function main() {
  const sweepArg = process.argv[2] ?? "";
  const options = new Set(process.argv.slice(3));
  const dryRun = options.has("--dry-run");
  const fast = options.has("--fast");
  const plan = getIngestionSweepPlan(sweepArg);
  const delayBetweenShards = fast ? 0 : plan.delayBetweenShards;
  if (dryRun) {
    console.log(JSON.stringify({ ...plan, delayBetweenShards, totalSpacingMs: (plan.shards.length - 1) * delayBetweenShards }));
    return;
  }

  let failedShards = 0;
  let partialShards = 0;
  let attemptedSources = 0;
  let succeededSources = 0;
  let recordedSourceFailures = 0;
  for (const shard of plan.shards) {
    const response = await runCronShard(shard, plan.sweep);
    const result = await response.json() as IngestionShardResult;
    const successfulShard = isSuccessfulIngestionShardResult(result, response.status);
    const completedWithSourceFailures = isCompletedWithRecordedSourceFailures(result, response.status);
    const completed = successfulShard || completedWithSourceFailures;
    const failed = !completed;
    if (failed) failedShards += 1;
    if (completed) {
      attemptedSources += result.attempted!;
      succeededSources += result.succeeded!;
      recordedSourceFailures += result.recordedSourceFailures!;
    }
    if (completedWithSourceFailures) {
      partialShards += 1;
      console.warn(`Cron ${plan.sweep} shard ${shard} completed with ${result.failed} recorded source failure(s)`);
    }

    console.log(JSON.stringify({
      sweep: plan.sweep,
      shard,
      status: response.status,
      ok: completed,
      partial: completedWithSourceFailures,
      attempted: result.attempted ?? 0,
      succeeded: result.succeeded ?? 0,
      failed: result.failed ?? 0,
      remaining: result.remaining?.length ?? 0,
      ...(result.error ? { error: result.error } : {}),
    }));

    if (shard < plan.shards.length - 1) await delay(delayBetweenShards);
  }
  if (partialShards > 0) {
    console.warn(`${recordedSourceFailures} source failure(s) were recorded in the database across ${partialShards} completed shard(s)`);
  }
  if (shouldFailIngestionSweep(plan.sweep, failedShards, attemptedSources, succeededSources)) {
    throw new Error(`${failedShards} ${plan.sweep} infrastructure/incomplete shard(s); ${succeededSources}/${attemptedSources} source(s) succeeded`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Ingestion sweep failed");
  process.exitCode = 1;
});
