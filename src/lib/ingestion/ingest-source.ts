import type { SupabaseClient } from "@supabase/supabase-js";
import { parseFeed } from "./parse-feed";
import { scrapeSource } from "./scrape-source";
import { canonicalizeUrl } from "./dedup";
import { fetchOgImage } from "./fetch-og-image";
import { mirrorThumbnail } from "@/lib/storage/thumbnails";
import { isThumbnailMirroringEnabled } from "@/lib/storage/thumbnail-policy";
import { classifyArticlesBatch } from "./category-classifier";
import type { FeedType, NormalizedArticle, ScrapeConfig } from "./types";
import { isArticleSummaryEnabled, isArticleSummaryQueueEnabled } from "./article-summary";
import { createArticleLookupBatches } from "./article-lookup-batches";
import { readOversizedArticleMatches, type ExistingArticleLookupRow } from "./oversized-article-lookup";
import { enqueuePendingSummaryJobs, getRecentSummaryRetryIds } from "./summary-job-queue";
import { summarizeArticlesDirect } from "./run-summary-jobs";
import { IngestionInfrastructureError } from "./error-message";

const POSTGRES_UNIQUE_VIOLATION = "23505";
const ARTICLE_CONCURRENCY = 4;

interface ArticleCandidate {
  article: NormalizedArticle;
  index: number;
  canonicalUrl: string;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  }));

  return results;
}

export interface SourceRow {
  id: string;
  site_url: string;
  feed_url: string | null;
  feed_type: FeedType;
  scrape_config: ScrapeConfig | null;
}

type InsertedArticleRow = { articleId: string; thumbnailUrl: string | null; index: number };

export async function processInsertedArticleMetadata(
  supabase: SupabaseClient,
  insertedRows: readonly InsertedArticleRow[],
  articles: readonly Pick<NormalizedArticle, "title" | "excerpt">[],
  dependencies: {
    mirrorEnabled?: boolean;
    mirror?: typeof mirrorThumbnail;
    classify?: typeof classifyArticlesBatch;
  } = {},
): Promise<void> {
  if (insertedRows.length === 0) return;
  const mirrorEnabled = dependencies.mirrorEnabled ?? isThumbnailMirroringEnabled();
  const mirror = dependencies.mirror ?? mirrorThumbnail;
  const classify = dependencies.classify ?? classifyArticlesBatch;

  await Promise.all([
    (async () => {
      if (!mirrorEnabled) return;
      await mapWithConcurrency(
        insertedRows.filter((row) => row.thumbnailUrl),
        ARTICLE_CONCURRENCY,
        async (row) => {
          const mirroredUrl = await mirror(supabase, row.thumbnailUrl!, row.articleId);
          if (mirroredUrl) {
            const { error } = await supabase.from("articles")
              .update({ thumbnail_url: mirroredUrl })
              .eq("id", row.articleId);
            if (error) throw new IngestionInfrastructureError("Update mirrored article thumbnail", error);
          }
        },
      );
    })(),
    (async () => {
      const classifications = await classify(
        insertedRows.map((row) => ({ title: articles[row.index].title, excerpt: articles[row.index].excerpt })),
      );
      await mapWithConcurrency(
        [...insertedRows],
        ARTICLE_CONCURRENCY,
        async (row, index) => {
          const classification = classifications[index];
          if (!classification) return;
          const { error } = await supabase.from("articles")
            .update({ category: classification.category, tags: classification.tags })
            .eq("id", row.articleId);
          if (error) throw new IngestionInfrastructureError("Update article classification", error);
        },
      );
    })(),
  ]);
}

export async function fetchArticlesForSource(source: SourceRow): Promise<NormalizedArticle[]> {
  if ((source.feed_type === "rss" || source.feed_type === "atom") && source.feed_url) {
    return (await parseFeed(source.feed_url)).articles;
  }
  if (source.feed_type === "scrape" && source.scrape_config) {
    return scrapeSource(source.site_url, source.scrape_config);
  }
  throw new Error(`소스(${source.id})의 수집 방식을 결정할 수 없습니다 (feed_type=${source.feed_type})`);
}

/**
 * 소스 하나를 수집해 articles 테이블에 삽입한다.
 * 두 종류의 중복을 모두 막는다 (docs/decisions.md 참고):
 *  - unique(source_id, dedup_key): 같은 소스를 재수집할 때 같은 글이 다시 쌓이는 것 방지
 *  - unique(canonical_url): 서로 다른 소스(예: 원본 블로그 + 큐레이션 사이트)가 같은 글을 가리킬 때 중복 방지
 * 두 제약 중 하나라도 걸리면(23505) 실패로 보지 않고 "중복으로 건너뜀"으로 처리한다.
 *
 * 글마다 og:image 조회(최대 5초)와 썸네일 미러링(최대 15초)이 붙는데, 예전엔 이걸 글 하나씩
 * 순차 처리했다 — 새 글이 많은 소스 하나가 배치(hop) 안에 섞이면 그 소스만으로 크론의 60초
 * 제한(maxDuration)을 넘겨 FUNCTION_INVOCATION_TIMEOUT으로 통째로 죽고, 그러면 다음 홉을 잇는
 * after() 콜백 자체가 실행될 기회조차 없어 self-chaining이 조용히 끊기는 문제가 있었다(실제
 * 배포본에서 504로 재현·확인, docs/decisions.md 2026-08-14 참고). 새 글 누락을 막기 위해 피드의
 * 모든 글을 처리하되, DB/이미지 요청은 작은 동시성 상한을 두어 CPU와 외부 요청 피크를 제한한다.
 */
export async function ingestSource(
  supabase: SupabaseClient,
  source: SourceRow
): Promise<{ found: number; inserted: number; duplicates: number }> {
  const articles = await fetchArticlesForSource(source);
  if (articles.length === 0) {
    return { found: 0, inserted: 0, duplicates: 0 };
  }

  const candidates: ArticleCandidate[] = articles.map((article, index) => {
    let canonicalUrl: string;
    try {
      canonicalUrl = canonicalizeUrl(article.url);
    } catch {
      canonicalUrl = article.url;
    }
    return { article, index, canonicalUrl };
  });
  const existingDedupKeys = new Set<string>();
  const existingCanonicalUrls = new Set<string>();
  const existingSummaryCandidates = new Map<string, string | null>();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new IngestionInfrastructureError("Build article lookup URLs", new Error("Missing Supabase URL"));
  const lookupPlan = createArticleLookupBatches(candidates, supabaseUrl, source.id);
  const oversizedCandidateSet = new Set(lookupPlan.oversized);
  if (lookupPlan.oversized.length > 0) {
    console.warn(`Cron ingestion source ${source.id} has ${lookupPlan.oversized.length} article(s) too large for a safe lookup URL; processing them separately`);
  }

  // Check both unique keys before requesting og:image or inserting. Repeated feed entries
  // are common, so avoid fetching each old article's page just to discover a 23505 afterward.
  await mapWithConcurrency(lookupPlan.batches, 2, async (batch) => {
    const [dedupResult, canonicalResult] = await Promise.all([
      supabase.from("articles")
        .select("id,dedup_key,discovered_at")
        .eq("source_id", source.id)
        .in("dedup_key", batch.map(({ article }) => article.dedupKey)),
      supabase.from("articles")
        .select("id,canonical_url,discovered_at")
        .in("canonical_url", batch.map(({ canonicalUrl }) => canonicalUrl)),
    ]);

    if (dedupResult.error) throw new IngestionInfrastructureError("Read existing article dedup keys", dedupResult.error);
    if (canonicalResult.error) throw new IngestionInfrastructureError("Read existing canonical article URLs", canonicalResult.error);
    for (const row of dedupResult.data ?? []) {
      existingDedupKeys.add(row.dedup_key);
      existingSummaryCandidates.set(row.id, row.discovered_at);
    }
    for (const row of canonicalResult.data ?? []) {
      existingCanonicalUrls.add(row.canonical_url);
      existingSummaryCandidates.set(row.id, row.discovered_at);
    }
  });

  if (lookupPlan.oversized.length > 0) {
    await readOversizedArticleMatches(
      lookupPlan.oversized,
      async (offset, pageSize) => {
        const { data, error } = await supabase.from("articles")
          .select("id,dedup_key,canonical_url,discovered_at")
          .eq("source_id", source.id)
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw new IngestionInfrastructureError("Read oversized article lookup keys", error);
        return (data ?? []) as ExistingArticleLookupRow[];
      },
      (row) => {
        existingDedupKeys.add(row.dedup_key);
        existingCanonicalUrls.add(row.canonical_url);
        existingSummaryCandidates.set(row.id, row.discovered_at);
      },
    );
  }

  const seenDedupKeys = new Set<string>();
  const seenCanonicalUrls = new Set<string>();
  const newCandidates = candidates.filter((candidate) => {
    const isDuplicate = existingDedupKeys.has(candidate.article.dedupKey) ||
      existingCanonicalUrls.has(candidate.canonicalUrl) ||
      seenDedupKeys.has(candidate.article.dedupKey) ||
      seenCanonicalUrls.has(candidate.canonicalUrl);
    seenDedupKeys.add(candidate.article.dedupKey);
    seenCanonicalUrls.add(candidate.canonicalUrl);
    return !isDuplicate;
  });

  if (isArticleSummaryQueueEnabled() && existingSummaryCandidates.size > 0) {
    // Reconcile recent inserts from a failed queue write without backfilling the old feed.
    const retryIds = getRecentSummaryRetryIds(
      [...existingSummaryCandidates].map(([id, discovered_at]) => ({ id, discovered_at })),
    );
    await enqueuePendingSummaryJobs(supabase, retryIds);
  }

  if (newCandidates.length === 0) {
    return { found: articles.length, inserted: 0, duplicates: articles.length };
  }

  const normalCandidates = newCandidates.filter((candidate) => !oversizedCandidateSet.has(candidate));
  const oversizedCandidates = newCandidates.filter((candidate) => oversizedCandidateSet.has(candidate));
  const insertCandidates = (candidatesToInsert: ArticleCandidate[]) => mapWithConcurrency(
    candidatesToInsert,
    ARTICLE_CONCURRENCY,
    async ({ article: a, index, canonicalUrl }) => {
      // RSS 필드/thumbnailSelector로 못 찾았을 때만 원문 페이지의 og:image를 한 번 더 시도한다 —
      // 소스마다 thumbnailSelector를 신경 쓰지 않아도 대부분의 사이트가 공유하는 메타 태그로 커버된다.
      const thumbnailUrl = a.thumbnailUrl ?? (await fetchOgImage(a.url));

      // category/tags는 DB 기본값('general'/'{}')으로 두고, 새로 삽입된 글만 아래에서 분류해 채운다.
      const { data: insertedRow, error } = await supabase
        .from("articles")
        .insert({
          source_id: source.id,
          title: a.title,
          url: a.url,
          canonical_url: canonicalUrl,
          excerpt: a.excerpt,
          thumbnail_url: thumbnailUrl,
          published_at: a.publishedAt,
          dedup_key: a.dedupKey,
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === POSTGRES_UNIQUE_VIOLATION) {
          return { duplicate: true as const };
        }
        throw new IngestionInfrastructureError("Insert article", error);
      }
      return { duplicate: false as const, articleId: insertedRow.id, thumbnailUrl, index };
    }
  );

  const normalInsertResults = await insertCandidates(normalCandidates);
  const normalInsertedRows = normalInsertResults.filter(
    (r): r is { duplicate: false; articleId: string; thumbnailUrl: string | null; index: number } => !r.duplicate
  );

  const processNewRows = async (insertedRows: typeof normalInsertedRows) => {
    // 새로 들어온 글만(중복 제외) (1) 썸네일을 우리 스토리지로 미러링하고 (2) AI로 카테고리/태그를
    // 분류한다 — 둘 다 새 글에만 필요한 후처리이고 서로 독립적이라 병렬로 진행한다.
    // 2026-08-20 결정: 원래는 매 실행마다 feed 전체(대부분 이미 저장된 중복)를 다시 분류해서 소스당
    // 최대 AI_TIMEOUT_MS(20초)가 삽입 전에 그대로 더해졌음 — 중복 글의 분류 결과는 애초에 insert가
    // 23505로 버려지면서 한 번도 저장되지 않는 완전한 낭비였고, 이 지연이 크론의 소스별 시간 상한과
    // 겹쳐 타임아웃의 실제 원인 중 하나였다(docs/decisions.md 참고). 새 글만 대상으로 하면 평소(중복만
    // 있는 날)엔 이 블록이 API 호출 없이 즉시 끝난다.
    await Promise.all([
      processInsertedArticleMetadata(supabase, insertedRows, articles),
      (async () => {
        if (!isArticleSummaryQueueEnabled() || insertedRows.length === 0) return;
        const insertedIds = insertedRows.map((r) => r.articleId);
        if (!isArticleSummaryEnabled()) {
          // Free ingestion workers can enqueue work without receiving an OpenAI key.
          await enqueuePendingSummaryJobs(supabase, insertedIds);
          return;
        }
        // 곳간 목록에 노출되기 전 새로 등록된 글의 본문 추출 및 AI 요약을 즉시 생성
        try {
          await summarizeArticlesDirect(insertedIds, supabase);
        } catch (summaryError) {
          console.error(`Immediate direct summary failed for source ${source.id}:`, summaryError);
          // 직접 실행 중 예외 발생 시 백그라운드 큐로 폴백 등록
          await enqueuePendingSummaryJobs(supabase, insertedIds);
        }
      })(),
    ]);
  };

  await processNewRows(normalInsertedRows);
  const oversizedInsertResults = await insertCandidates(oversizedCandidates);
  const oversizedInsertedRows = oversizedInsertResults.filter(
    (r): r is { duplicate: false; articleId: string; thumbnailUrl: string | null; index: number } => !r.duplicate
  );
  await processNewRows(oversizedInsertedRows);

  const insertedCount = normalInsertedRows.length + oversizedInsertedRows.length;
  const duplicates = articles.length - insertedCount;
  return { found: articles.length, inserted: insertedCount, duplicates };
}
