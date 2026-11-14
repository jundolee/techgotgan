import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchCachedRpcFromSupabase } from "@/lib/supabase/cached-rest";
import {
  ARTICLE_SUMMARY_PROMPT_VERSION,
  LEGACY_ARTICLE_SUMMARY_PROMPT_VERSION,
  EARLIEST_ARTICLE_SUMMARY_PROMPT_VERSION,
} from "@/lib/ingestion/article-summary";

export interface RelatedArticle {
  id: string;
  title: string;
  sourceTitle: string | null;
  excerpt: string | null;
  category: string;
  publishedAt: string | null;
  similarityScore?: number | null;
  isSemanticMatch?: boolean;
}

export interface ArticlePreview {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  publishedAt: string | null;
  category: string;
  tags: string[];
  sourceTitle: string | null;
  summary: { lead: string; keyPoints: string[] } | null;
  summaryBasis: "full_article" | "partial_article" | "excerpt" | null;
  summaryStatus: "pending" | "processing" | "ready" | "unavailable" | "failed" | null;
  summaryGeneratedAt: string | null;
}

interface ArticleSummaryJobRow {
  article_id?: string;
  status: string;
  lead: string | null;
  key_points: string[] | null;
  extraction_status: string | null;
  prompt_version: string;
  generated_at: string | null;
}

interface ArticleSummaryState {
  summary: ArticlePreview["summary"];
  summaryBasis: ArticlePreview["summaryBasis"];
  summaryStatus: ArticlePreview["summaryStatus"];
  summaryGeneratedAt: string | null;
}

function resolveArticleSummary(rows: ArticleSummaryJobRow[]): ArticleSummaryState {
  const current = rows.find((row) => row.prompt_version === ARTICLE_SUMMARY_PROMPT_VERSION);
  const legacyV1 = rows.find((row) => row.prompt_version === LEGACY_ARTICLE_SUMMARY_PROMPT_VERSION);
  const earliest = rows.find((row) => row.prompt_version === EARLIEST_ARTICLE_SUMMARY_PROMPT_VERSION);
  const isReady = (row: ArticleSummaryJobRow | undefined) => row?.status === "ready" && Array.isArray(row.key_points);
  const selected = isReady(current) ? current : isReady(legacyV1) ? legacyV1 : isReady(earliest) ? earliest : current;
  if (!selected) return { summary: null, summaryBasis: null, summaryStatus: null, summaryGeneratedAt: null };

  const allowedStatuses = ["pending", "processing", "ready", "unavailable", "failed"] as const;
  const summaryStatus = allowedStatuses.includes(selected.status as typeof allowedStatuses[number])
    ? selected.status as ArticlePreview["summaryStatus"]
    : null;
  if (summaryStatus !== "ready" || !Array.isArray(selected.key_points)) {
    return { summary: null, summaryBasis: null, summaryStatus, summaryGeneratedAt: selected.generated_at };
  }

  return {
    summary: {
      lead: selected.lead ?? "",
      keyPoints: selected.key_points.filter((point): point is string => typeof point === "string"),
    },
    summaryBasis: selected.prompt_version === EARLIEST_ARTICLE_SUMMARY_PROMPT_VERSION
      ? "excerpt"
      : selected.extraction_status === "partial" ? "partial_article" : "full_article",
    summaryStatus,
    summaryGeneratedAt: selected.generated_at,
  };
}

interface IndexableArticleRow {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  published_at: string | null;
  category: string | null;
  tags: string[] | null;
  source: { title: string | null } | { title: string | null }[] | null;
}

/** Public SEO experiment: batch eligible summaries to keep sitemap fetches bounded. */
export async function getIndexableArticlePreviews(limit = 200): Promise<ArticlePreview[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const client = createServiceClient();
  const { data: articles, error } = await client
    .from("articles")
    .select("id,title,url,excerpt,published_at,category,tags,source:sources(title)")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(safeLimit);
  if (error) throw error;

  const articleRows = (articles ?? []) as IndexableArticleRow[];
  if (articleRows.length === 0) return [];
  const promptVersions = [
    ARTICLE_SUMMARY_PROMPT_VERSION,
    LEGACY_ARTICLE_SUMMARY_PROMPT_VERSION,
    EARLIEST_ARTICLE_SUMMARY_PROMPT_VERSION,
  ];
  const { data: jobs, error: summaryError } = await client
    .from("article_summary_jobs")
    .select("article_id,status,lead,key_points,extraction_status,prompt_version,generated_at")
    .in("article_id", articleRows.map((article) => article.id))
    .in("prompt_version", promptVersions);
  if (summaryError) {
    if (summaryError.code === "42P01") {
      console.warn("article_summary_jobs table is not installed yet; no article summary is available.");
    } else {
      console.error("Failed to read article summaries for sitemap:", summaryError.message);
    }
    return [];
  }

  const jobsByArticleId = new Map<string, ArticleSummaryJobRow[]>();
  for (const job of (jobs ?? []) as ArticleSummaryJobRow[]) {
    if (!job.article_id) continue;
    const current = jobsByArticleId.get(job.article_id) ?? [];
    current.push(job);
    jobsByArticleId.set(job.article_id, current);
  }

  const previews = articleRows.map((article) => {
    const source = Array.isArray(article.source) ? article.source[0] : article.source;
    const summaryState = resolveArticleSummary(jobsByArticleId.get(article.id) ?? []);
    return {
      id: article.id,
      title: article.title,
      url: article.url,
      excerpt: article.excerpt,
      publishedAt: article.published_at,
      category: article.category ?? "general",
      tags: article.tags ?? [],
      sourceTitle: source?.title ?? null,
      ...summaryState,
    } satisfies ArticlePreview;
  });
  return previews.filter((article): article is ArticlePreview =>
    Boolean(article?.summary && article.summaryBasis === "full_article" && article.title.trim().length >= 12 && (article.excerpt?.trim().length ?? 0) >= 40)
  );
}

interface RelatedArticleRow {
  id: string;
  title: string;
  excerpt: string | null;
  category: string;
  tags: string[] | null;
  published_at: string | null;
  source:
    | { title: string | null }
    | { title: string | null }[]
    | null;
}

const DEFAULT_RELATED_ARTICLES = 3;
const MAX_RELATED_ARTICLES = 12;
const TAG_OVERLAP_CANDIDATE_LIMIT = 200;
const RELATED_ARTICLE_SELECT = "id,title,excerpt,category,tags,published_at,source:sources(title)";

export async function getArticlePreview(
  articleId: string,
  options: { includeSummary?: boolean } = {}
): Promise<ArticlePreview | null> {
  const supabase = createServiceClient();
  const articlePromise = supabase
    .from("articles")
    .select("id,title,url,excerpt,published_at,category,tags,source:sources(title)")
    .eq("id", articleId)
    .maybeSingle();
  const summaryPromise = options.includeSummary
    ? supabase
      .from("article_summary_jobs")
      .select("status,lead,key_points,extraction_status,prompt_version,generated_at")
      .eq("article_id", articleId)
      .in("prompt_version", [
        ARTICLE_SUMMARY_PROMPT_VERSION,
        LEGACY_ARTICLE_SUMMARY_PROMPT_VERSION,
        EARLIEST_ARTICLE_SUMMARY_PROMPT_VERSION,
      ])
    : null;
  const [{ data, error }, summaryResult] = await Promise.all([
    articlePromise,
    summaryPromise ?? Promise.resolve(null),
  ]);
  if (error) throw error;
  if (!data) return null;

  const source = Array.isArray(data.source) ? data.source[0] : data.source;
  let summaryState: ArticleSummaryState = { summary: null, summaryBasis: null, summaryStatus: null, summaryGeneratedAt: null };
  if (summaryResult?.error) {
    if (summaryResult.error.code === "42P01") {
      console.warn("article_summary_jobs table is not installed yet; no article summary is available.");
    } else {
      console.error("Failed to read article summary:", summaryResult.error.message);
    }
  } else {
    summaryState = resolveArticleSummary((summaryResult?.data ?? []) as ArticleSummaryJobRow[]);
  }

  return {
    id: data.id,
    title: data.title,
    url: data.url,
    excerpt: data.excerpt,
    publishedAt: data.published_at,
    category: data.category ?? "general",
    tags: data.tags ?? [],
    sourceTitle: source?.title ?? null,
    ...summaryState,
  };
}

function getSafeLimit(limit?: number): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_RELATED_ARTICLES;
  return Math.min(MAX_RELATED_ARTICLES, Math.max(0, Math.trunc(limit)));
}

function getTagOverlapCount(articleTags: string[] | null, currentTags: Set<string>): number {
  if (!articleTags) return 0;
  return new Set(articleTags.filter((tag) => currentTags.has(tag))).size;
}

function comparePublishedAtDescending(
  left: string | null,
  right: string | null
): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;

  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (Number.isNaN(leftTime)) return Number.isNaN(rightTime) ? 0 : 1;
  if (Number.isNaN(rightTime)) return -1;
  return rightTime - leftTime;
}

function toRelatedArticle(row: RelatedArticleRow): RelatedArticle {
  const source = Array.isArray(row.source) ? row.source[0] : row.source;
  return {
    id: row.id,
    title: row.title,
    sourceTitle: source?.title ?? null,
    excerpt: row.excerpt,
    category: row.category,
    publishedAt: row.published_at,
  };
}

interface RelatedArticleRpcRow {
  article_status: string;
  related_article_id: string | null;
  score: number | null;
  title: string | null;
  url: string | null;
  excerpt: string | null;
  published_at: string | null;
  category: string | null;
  tags: string[] | null;
  source_id: string | null;
  source_title: string | null;
  source_site_url: string | null;
  source_favicon_url: string | null;
}

/**
 * Finds related articles, prioritizing Pinecone semantic similarity candidates.
 * Falls back to same-category articles with shared tags if semantic candidates are unavailable.
 */
export async function getRelatedArticles(
  articleId: string,
  category?: string | null,
  tags?: string[] | null,
  limit?: number
): Promise<RelatedArticle[]> {
  const safeLimit = getSafeLimit(limit);
  if (safeLimit === 0) return [];

  // 1. Try reading Pinecone semantic similarity candidates from cached RPC
  try {
    const semanticRows = await fetchCachedRpcFromSupabase<RelatedArticleRpcRow[]>(
      "get_article_related_candidates",
      {
        requested_article_id: articleId,
        requested_limit: String(safeLimit),
      },
      { revalidate: 300, tags: ["article-related-candidates", "articles"] }
    );

    const validSemanticArticles: RelatedArticle[] = [];
    for (const row of semanticRows) {
      if (row.related_article_id && row.title && row.source_title) {
        validSemanticArticles.push({
          id: row.related_article_id,
          title: row.title,
          sourceTitle: row.source_title,
          excerpt: row.excerpt,
          category: row.category ?? "general",
          publishedAt: row.published_at,
          similarityScore: row.score,
          isSemanticMatch: true,
        });
      }
    }

    if (validSemanticArticles.length >= safeLimit) {
      return validSemanticArticles.slice(0, safeLimit);
    }
    if (validSemanticArticles.length > 0) {
      if (!category) return validSemanticArticles.slice(0, safeLimit);
      const seenIds = new Set(validSemanticArticles.map((a) => a.id));
      seenIds.add(articleId);

      const fallbackArticles = await getCategoryFallbackArticles(articleId, category, tags, safeLimit, seenIds);
      return [...validSemanticArticles, ...fallbackArticles].slice(0, safeLimit);
    }
  } catch (cause) {
    console.warn("Pinecone related article lookup failed; falling back to tag/category matching:", cause instanceof Error ? cause.message : "unknown");
  }

  // 2. Fallback to tag overlap + category matching
  if (!category) return [];
  return getCategoryFallbackArticles(articleId, category, tags, safeLimit, new Set([articleId]));
}

async function getCategoryFallbackArticles(
  articleId: string,
  category: string,
  tags: string[] | null | undefined,
  limit: number,
  excludeIds: Set<string>
): Promise<RelatedArticle[]> {
  const normalizedTags = [...new Set((tags ?? []).filter((tag) => tag.length > 0))].sort();
  const excludedIds = [...excludeIds].sort();
  const load = unstable_cache(
    async () => {
      const supabase = createServiceClient();
      const currentTags = new Set(normalizedTags);
      const excluded = new Set(excludedIds);
      const candidates: RelatedArticleRow[] = [];

      if (currentTags.size > 0) {
        const { data, error } = await supabase
          .from("articles")
          .select(RELATED_ARTICLE_SELECT)
          .eq("category", category)
          .neq("id", articleId)
          .overlaps("tags", [...currentTags])
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("id", { ascending: true })
          .limit(TAG_OVERLAP_CANDIDATE_LIMIT);

        if (error) throw error;
        for (const row of (data ?? []) as unknown as RelatedArticleRow[]) {
          if (!excluded.has(row.id)) candidates.push(row);
        }
      }

      if (candidates.length < limit) {
        const { data, error } = await supabase
          .from("articles")
          .select(RELATED_ARTICLE_SELECT)
          .eq("category", category)
          .neq("id", articleId)
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("id", { ascending: true })
          .limit(limit + excluded.size);

        if (error) throw error;
        const candidateIds = new Set(candidates.map((candidate) => candidate.id));
        for (const row of (data ?? []) as unknown as RelatedArticleRow[]) {
          if (!excluded.has(row.id) && !candidateIds.has(row.id)) candidates.push(row);
        }
      }

      candidates.sort((left, right) => {
        const overlapDifference =
          getTagOverlapCount(right.tags, currentTags) - getTagOverlapCount(left.tags, currentTags);
        if (overlapDifference !== 0) return overlapDifference;

        const dateDifference = comparePublishedAtDescending(left.published_at, right.published_at);
        if (dateDifference !== 0) return dateDifference;
        if (left.id < right.id) return -1;
        if (left.id > right.id) return 1;
        return 0;
      });

      return candidates.slice(0, limit).map((row) => ({
        ...toRelatedArticle(row),
        isSemanticMatch: false,
      }));
    },
    ["related-article-category-fallback-v1", articleId, category, JSON.stringify(normalizedTags), String(limit), JSON.stringify(excludedIds)],
    { revalidate: 300, tags: ["articles", "article-related-candidates"] }
  );

  return load();
}
