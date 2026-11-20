import { CRON_SHARD_COUNT } from "../src/lib/ingestion/cron-sharding";

export type IngestionSweep = "first" | "retry";

export type IngestionShardResult = {
  ok?: boolean;
  selected?: number;
  attempted?: number;
  succeeded?: number;
  failed?: number;
  recordedSourceFailures?: number;
  infrastructureFailures?: number;
  remaining?: string[];
  error?: string;
};

function hasValidShardCounts(result: IngestionShardResult): result is IngestionShardResult & {
  selected: number;
  attempted: number;
  succeeded: number;
  failed: number;
  recordedSourceFailures: number;
  infrastructureFailures: number;
  remaining: string[];
} {
  const values = [
    result.selected,
    result.attempted,
    result.succeeded,
    result.failed,
    result.recordedSourceFailures,
    result.infrastructureFailures,
  ];
  return values.every((value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0) &&
    Array.isArray(result.remaining) && result.remaining.every((id) => typeof id === "string") &&
    result.attempted === result.succeeded! + result.failed! &&
    result.recordedSourceFailures! + result.infrastructureFailures! === result.failed! &&
    result.attempted! + result.remaining.length === result.selected!;
}

export function isSuccessfulIngestionShardResult(result: IngestionShardResult, status: number): boolean {
  return status === 200 && result.ok === true && hasValidShardCounts(result) &&
    result.failed === 0 && result.infrastructureFailures === 0 && result.recordedSourceFailures === 0 &&
    result.remaining.length === 0 && result.succeeded === result.attempted;
}

export function isCompletedWithRecordedSourceFailures(
  result: IngestionShardResult,
  status: number,
): boolean {
  return status === 503 && result.ok === false && hasValidShardCounts(result) &&
    result.failed > 0 && result.recordedSourceFailures === result.failed &&
    result.infrastructureFailures === 0 && result.remaining.length === 0;
}

export function shouldFailIngestionSweep(failedShards: number, attempted: number, succeeded: number): boolean {
  return failedShards > 0 || (attempted > 0 && succeeded === 0);
}

export function getIngestionSweepPlan(value: string): {
  sweep: IngestionSweep;
  shards: number[];
  delayBetweenShards: number;
} {
  if (value !== "first" && value !== "retry") throw new Error("Sweep must be first or retry");
  return {
    sweep: value,
    shards: Array.from({ length: CRON_SHARD_COUNT }, (_, shard) => shard),
    delayBetweenShards: value === "first" ? 180_000 : 60_000,
  };
}
