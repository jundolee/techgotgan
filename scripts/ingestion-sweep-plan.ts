import { CRON_SHARD_COUNT } from "../src/lib/ingestion/cron-sharding";

export type IngestionSweep = "first" | "retry";

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
