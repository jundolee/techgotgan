import { setTimeout as delay } from "node:timers/promises";
import { runCronShard } from "@/lib/ingestion/run-cron-shard";
import { getIngestionSweepPlan } from "./ingestion-sweep-plan";

type ShardResult = {
  ok?: boolean;
  attempted?: number;
  succeeded?: number;
  failed?: number;
  remaining?: string[];
  error?: string;
};

async function main() {
  const sweepArg = process.argv[2] ?? "";
  const dryRun = process.argv[3] === "--dry-run";
  const plan = getIngestionSweepPlan(sweepArg);
  if (dryRun) {
    console.log(JSON.stringify({ ...plan, totalSpacingMs: (plan.shards.length - 1) * plan.delayBetweenShards }));
    return;
  }

  let failedShards = 0;
  for (const shard of plan.shards) {
    const response = await runCronShard(shard, plan.sweep);
    const result = await response.json() as ShardResult;
    const failed = !response.ok || result.ok === false;
    if (failed) failedShards += 1;

    console.log(JSON.stringify({
      sweep: plan.sweep,
      shard,
      status: response.status,
      ok: !failed,
      attempted: result.attempted ?? 0,
      succeeded: result.succeeded ?? 0,
      failed: result.failed ?? 0,
      remaining: result.remaining?.length ?? 0,
      ...(result.error ? { error: result.error } : {}),
    }));

    if (shard < plan.shards.length - 1) await delay(plan.delayBetweenShards);
  }
  if (failedShards > 0) throw new Error(`${failedShards} ${plan.sweep} ingestion shard(s) did not complete successfully`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Ingestion sweep failed");
  process.exitCode = 1;
});
