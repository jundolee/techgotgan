import { runSummaryJobs } from "@/lib/ingestion/run-summary-jobs";

async function main() {
  const result = await runSummaryJobs(24);
  console.log(JSON.stringify(result));
  if (result.failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Summary worker failed");
  process.exitCode = 1;
});
