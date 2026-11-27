import { createServiceClient } from "@/lib/supabase/service";
import { getIngestionErrorMessage } from "@/lib/ingestion/error-message";
import { resolveArticleTags, type ArticleCategory } from "@/lib/ingestion/category-classifier";

const PAGE_SIZE = 200;
const WRITE_CONCURRENCY = 8;
const VALID_CATEGORIES = new Set<ArticleCategory>([
  "frontend",
  "backend",
  "ai_ml",
  "devops",
  "mobile",
  "data",
  "culture",
  "general",
]);

type ArticleTagRow = {
  id: string;
  title: string;
  excerpt: string | null;
  category: string;
  tags: string[] | null;
};

type TagUpdate = { id: string; title: string; category: ArticleCategory; tags: string[] };

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  }));

  return results;
}

async function collectTagUpdates(client: ReturnType<typeof createServiceClient>) {
  const updates: TagUpdate[] = [];
  const emptyTagsByCategory: Record<string, number> = {};
  const skippedWithoutSignalByCategory: Record<string, number> = {};
  let scanned = 0;
  let cursor: string | null = null;

  while (true) {
    let query = client.from("articles")
      .select("id,title,excerpt,category,tags")
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    if (cursor) query = query.gt("id", cursor);

    const { data, error } = await query;
    if (error) throw new Error(`Read articles for tag backfill: ${getIngestionErrorMessage(error)}`);

    const page = (data ?? []) as ArticleTagRow[];
    if (page.length === 0) break;
    scanned += page.length;
    cursor = page[page.length - 1].id;

    for (const article of page) {
      if (Array.isArray(article.tags) && article.tags.length > 0) continue;
      const category = VALID_CATEGORIES.has(article.category as ArticleCategory)
        ? article.category as ArticleCategory
        : "general";
      emptyTagsByCategory[category] = (emptyTagsByCategory[category] ?? 0) + 1;

      const tags = resolveArticleTags(category, [], article.title, article.excerpt);
      if (tags.length === 0) {
        skippedWithoutSignalByCategory[category] = (skippedWithoutSignalByCategory[category] ?? 0) + 1;
        continue;
      }
      updates.push({ id: article.id, title: article.title, category, tags });
    }

    if (page.length < PAGE_SIZE) break;
  }

  return { updates, emptyTagsByCategory, skippedWithoutSignalByCategory, scanned };
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && process.env.ARTICLE_TAG_BACKFILL_APPROVED !== "true") {
    throw new Error("Set ARTICLE_TAG_BACKFILL_APPROVED=true to apply tag backfill updates");
  }

  const client = createServiceClient();
  const { updates, emptyTagsByCategory, skippedWithoutSignalByCategory, scanned } = await collectTagUpdates(client);
  const proposedTagsByCategory: Record<string, number> = {};
  const proposedTags: Record<string, number> = {};
  for (const update of updates) {
    proposedTagsByCategory[update.category] = (proposedTagsByCategory[update.category] ?? 0) + 1;
    for (const tag of update.tags) proposedTags[tag] = (proposedTags[tag] ?? 0) + 1;
  }

  if (!apply) {
    console.log(JSON.stringify({
      mode: "dry-run",
      scanned,
      emptyTagsByCategory,
      rowsToUpdate: updates.length,
      skippedWithoutSignalByCategory,
      proposedTagsByCategory,
      proposedTags,
      sampleUpdates: updates.slice(0, 20).map(({ title, category, tags }) => ({ title, category, tags })),
    }));
    return;
  }

  const results = await mapWithConcurrency(updates, WRITE_CONCURRENCY, async (update) => {
    const { data, error } = await client.from("articles")
      .update({ tags: update.tags })
      .eq("id", update.id)
      .eq("tags", "{}")
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Update article tags: ${getIngestionErrorMessage(error)}`);
    return Boolean(data);
  });

  const updated = results.filter(Boolean).length;
  console.log(JSON.stringify({
    mode: "applied",
    scanned,
    emptyTagsByCategory,
    planned: updates.length,
    updated,
    skippedBecauseTagsChanged: updates.length - updated,
    skippedWithoutSignalByCategory,
    proposedTagsByCategory,
    proposedTags,
  }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Tag backfill failed");
  process.exitCode = 1;
});
