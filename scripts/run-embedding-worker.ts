import { processArticleEmbeddingJobs } from "@/lib/ingestion/process-article-embedding-jobs";

async function main() {
  if (process.env.ENABLE_EMBEDDING_JOBS !== "true") {
    console.log("Embedding schedule is disabled; set ENABLE_EMBEDDING_JOBS=true to enable it.");
    return;
  }

  const result = await processArticleEmbeddingJobs(200);
  console.log(JSON.stringify(result));
  if (result.embeddingsFailed > 0 || result.deletionsFailed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Embedding worker failed");
  process.exitCode = 1;
});
