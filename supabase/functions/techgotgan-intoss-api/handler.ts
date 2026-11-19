export interface IntossApiEnvironment {
  SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SECRET_KEYS?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  APP_IN_TOSS_APP_NAME?: string;
  APP_IN_TOSS_ALLOWED_ORIGINS?: string;
}

type PublicArticleRow = {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  discovered_at?: string | null;
  click_count: number;
  category: string;
  tags: string[] | null;
  source: {
    id: string;
    title: string | null;
    site_url: string;
    favicon_url: string | null;
  } | {
    id: string;
    title: string | null;
    site_url: string;
    favicon_url: string | null;
  }[] | null;
};

type SearchArticleRow = {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  click_count: number;
  category: string | null;
  tags: string[] | null;
  source_id: string;
  source_title: string | null;
  source_site_url: string;
  source_favicon_url: string | null;
};

type SummaryJobRow = {
  status: string;
  lead: string | null;
  key_points: string[] | null;
  extraction_status: string | null;
  prompt_version: string;
  generated_at: string | null;
};

type PublisherRow = {
  id: string;
  title: string | null;
  site_url: string;
  favicon_url: string | null;
};

type IsoWeek = { year: number; week: number };
type CalendarDate = { year: number; month: number; day: number };
type DigestDistribution = { label: string; count: number; percentage: number };

const SUMMARY_VERSIONS = [
  "2026-10-22-plain-korean-v1",
  "2026-10-21-full-article-v1",
  "2026-10-20-excerpt-v2",
] as const;
const SUMMARY_STATUSES = new Set([
  "pending",
  "processing",
  "ready",
  "unavailable",
  "failed",
]);
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const CATEGORY_LABELS: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  ai_ml: "AI / ML",
  devops: "DevOps",
  mobile: "Mobile",
  data: "Data",
  culture: "Culture",
  general: "General",
};
const DEVELOPMENT_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const ARTICLE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getAllowedOrigins(env: IntossApiEnvironment): Set<string> {
  const appName = env.APP_IN_TOSS_APP_NAME?.trim().toLowerCase() ||
    "techgotgan";
  const configuredOrigins = (env.APP_IN_TOSS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([
    ...DEVELOPMENT_ORIGINS,
    `https://${appName}.apps.tossmini.com`,
    `https://${appName}.private-apps.tossmini.com`,
    ...configuredOrigins,
  ]);
}

function withCors(
  request: Request,
  response: Response,
  env: IntossApiEnvironment,
): Response {
  const origin = request.headers.get("origin");
  const headers = new Headers(response.headers);
  headers.append("Vary", "Origin");
  if (origin && getAllowedOrigins(env).has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "apikey, content-type");
    headers.set("Access-Control-Max-Age", "600");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(
  request: Request,
  env: IntossApiEnvironment,
  body: unknown,
  status = 200,
  cache = "private, no-store",
): Response {
  return withCors(
    request,
    Response.json(body, { status, headers: { "Cache-Control": cache } }),
    env,
  );
}

function getDatabaseConfig(env: IntossApiEnvironment) {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  let key: string | undefined;
  try {
    const secretKeys: unknown = JSON.parse(env.SUPABASE_SECRET_KEYS ?? "{}");
    if (
      typeof secretKeys === "object" && secretKeys !== null &&
      "default" in secretKeys && typeof secretKeys.default === "string"
    ) {
      key = secretKeys.default;
    }
  } catch {
    // Fall back to the legacy service-role variable for older Supabase projects.
  }
  key ??= env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("database_not_configured");
  return { url: url.replace(/\/$/, ""), key };
}

function databaseRequest(
  key: string,
  method = "GET",
  body?: unknown,
): RequestInit {
  const headers: Record<string, string> = {
    apikey: key,
    Accept: "application/json",
  };
  // New sb_secret_ keys are opaque API keys, not JWTs. Legacy service-role keys are JWTs.
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;

  return {
    method,
    headers: {
      ...headers,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`database_http_${response.status}`);
  return await response.json() as T;
}

async function getFeed(
  env: IntossApiEnvironment,
  fetcher: typeof fetch,
  sourceId?: string,
): Promise<PublicArticleRow[]> {
  const { url, key } = getDatabaseConfig(env);
  const endpoint = new URL(`${url}/rest/v1/articles`);
  endpoint.searchParams.set(
    "select",
    "id,title,url,excerpt,thumbnail_url,published_at,discovered_at,click_count,category,tags,source:sources(id,title,site_url,favicon_url)",
  );
  endpoint.searchParams.set("order", "published_at.desc.nullslast");
  endpoint.searchParams.set("limit", sourceId ? "50" : "100");
  if (sourceId) endpoint.searchParams.set("source_id", `eq.${sourceId}`);
  const rows = await readJson<PublicArticleRow[]>(
    await fetcher(endpoint, databaseRequest(key)),
  );
  return rows.map((row) => ({
    ...row,
    category: row.category || "general",
    tags: row.tags ?? [],
    source: Array.isArray(row.source) ? row.source[0] ?? null : row.source,
  }));
}

async function getPublishers(
  env: IntossApiEnvironment,
  fetcher: typeof fetch,
): Promise<PublisherRow[]> {
  const { url, key } = getDatabaseConfig(env);
  const endpoint = new URL(`${url}/rest/v1/sources`);
  endpoint.searchParams.set("select", "id,title,site_url,favicon_url");
  endpoint.searchParams.set("is_active", "eq.true");
  endpoint.searchParams.set("order", "created_at.desc");
  endpoint.searchParams.set("limit", "500");
  const rows = await readJson<PublisherRow[]>(await fetcher(endpoint, databaseRequest(key)));
  return rows.map(({ id, title, site_url, favicon_url }) => ({ id, title, site_url, favicon_url }));
}

function kstCalendarDate(value: string): CalendarDate {
  const date = new Date(Date.parse(value) + KST_OFFSET_MS);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function isoWeekFromCalendarDate({ year, month, day }: CalendarDate): IsoWeek {
  const date = new Date(Date.UTC(year, month - 1, day));
  const isoDay = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - isoDay);
  const isoYear = date.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7);
  return { year: isoYear, week };
}

function isoWeeksInYear(year: number): number {
  return isoWeekFromCalendarDate({ year, month: 12, day: 28 }).week;
}

function parseIsoWeek(value: string): IsoWeek | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  return week >= 1 && week <= isoWeeksInYear(year) ? { year, week } : null;
}

function weekRange(week: IsoWeek): { start: Date; end: Date; dateRangeLabel: string } {
  const januaryFourth = new Date(Date.UTC(week.year, 0, 4));
  const mondayOffset = (januaryFourth.getUTCDay() || 7) - 1;
  const mondayUtc = Date.UTC(week.year, 0, 4 - mondayOffset + (week.week - 1) * 7);
  const start = new Date(mondayUtc - KST_OFFSET_MS);
  const end = new Date(start.getTime() + 7 * DAY_MS);
  const format = (date: Date) => new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
  return {
    start,
    end,
    dateRangeLabel: `${format(start)} – ${format(new Date(end.getTime() - DAY_MS))}`,
  };
}

function weekId(week: IsoWeek): string {
  return `${week.year}-W${String(week.week).padStart(2, "0")}`;
}

function weekLabel(week: IsoWeek): string {
  return `${week.year}년 ${week.week}주차`;
}

function summarizeDistribution<T>(items: T[], getLabel: (item: T) => string): DigestDistribution[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = getLabel(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, percentage: Math.round((count / items.length) * 100) }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "ko"));
}

async function getDigestWeeks(env: IntossApiEnvironment, fetcher: typeof fetch) {
  const { url, key } = getDatabaseConfig(env);
  const endpoint = new URL(`${url}/rest/v1/articles`);
  endpoint.searchParams.set("select", "published_at,discovered_at");
  endpoint.searchParams.set("published_at", "not.is.null");
  endpoint.searchParams.set("order", "published_at.desc");
  endpoint.searchParams.set("limit", "1000");
  const articles = await readJson<Array<{ published_at: string; discovered_at: string }>>(
    await fetcher(endpoint, databaseRequest(key)),
  );
  const counts = new Map<string, { week: IsoWeek; articleCount: number; lastModified: string }>();
  for (const article of articles) {
    const week = isoWeekFromCalendarDate(kstCalendarDate(article.published_at));
    const id = weekId(week);
    const current = counts.get(id);
    counts.set(id, {
      week,
      articleCount: (current?.articleCount ?? 0) + 1,
      lastModified: !current || Date.parse(article.discovered_at) > Date.parse(current.lastModified)
        ? article.discovered_at
        : current.lastModified,
    });
  }
  return [...counts.values()]
    .sort((left, right) => right.week.year - left.week.year || right.week.week - left.week.week)
    .slice(0, 12)
    .map(({ week, articleCount, lastModified }) => {
      const range = weekRange(week);
      return {
        week: weekId(week),
        label: weekLabel(week),
        dateRangeLabel: range.dateRangeLabel,
        articleCount,
        lastModified,
      };
    });
}

async function getDigest(env: IntossApiEnvironment, fetcher: typeof fetch, value: string) {
  const week = parseIsoWeek(value);
  if (!week) return null;
  const range = weekRange(week);
  const { url, key } = getDatabaseConfig(env);
  const endpoint = new URL(`${url}/rest/v1/articles`);
  endpoint.searchParams.set("select", "id,title,url,excerpt,thumbnail_url,published_at,discovered_at,click_count,category,tags,source:sources(id,title,site_url,favicon_url)");
  endpoint.searchParams.set("and", `(published_at.gte.${range.start.toISOString()},published_at.lt.${range.end.toISOString()})`);
  endpoint.searchParams.set("order", "published_at.desc");
  endpoint.searchParams.set("limit", "1000");
  const rows = await readJson<PublicArticleRow[]>(await fetcher(endpoint, databaseRequest(key)));
  if (rows.length === 0) return null;
  const articles = rows.map((row) => ({
    ...row,
    category: row.category || "general",
    tags: row.tags ?? [],
    source: Array.isArray(row.source) ? row.source[0] ?? null : row.source,
  }));
  const latestArticles = articles.slice(0, 24);
  const lastModified = rows.reduce((latest, row) => {
    const candidate = row.discovered_at ?? row.published_at;
    return candidate && Date.parse(candidate) > Date.parse(latest) ? candidate : latest;
  }, rows[0].discovered_at ?? rows[0].published_at ?? "");

  return {
    week: value,
    label: weekLabel(week),
    dateRangeLabel: range.dateRangeLabel,
    articleCount: rows.length,
    lastModified,
    latestArticles,
    categoryDistribution: summarizeDistribution(articles, (article) => CATEGORY_LABELS[article.category] ?? CATEGORY_LABELS.general),
    sourceDistribution: summarizeDistribution(articles, (article) => article.source?.title ?? article.source?.site_url ?? "알 수 없는 소스"),
  };
}

async function searchArticles(
  env: IntossApiEnvironment,
  fetcher: typeof fetch,
  query: string,
): Promise<SearchArticleRow[]> {
  const { url, key } = getDatabaseConfig(env);
  const endpoint = new URL(`${url}/rest/v1/rpc/search_articles`);
  return readJson<SearchArticleRow[]>(
    await fetcher(
      endpoint,
      databaseRequest(key, "POST", { search_query: query }),
    ),
  );
}

async function getArticle(
  env: IntossApiEnvironment,
  fetcher: typeof fetch,
  id: string,
) {
  const { url, key } = getDatabaseConfig(env);
  const articleUrl = new URL(`${url}/rest/v1/articles`);
  articleUrl.searchParams.set(
    "select",
    "id,title,url,excerpt,published_at,category,tags,source:sources(title)",
  );
  articleUrl.searchParams.set("id", `eq.${id}`);
  articleUrl.searchParams.set("limit", "1");

  const summaryUrl = new URL(`${url}/rest/v1/article_summary_jobs`);
  summaryUrl.searchParams.set(
    "select",
    "status,lead,key_points,extraction_status,prompt_version,generated_at",
  );
  summaryUrl.searchParams.set("article_id", `eq.${id}`);
  summaryUrl.searchParams.set(
    "prompt_version",
    `in.(${SUMMARY_VERSIONS.join(",")})`,
  );

  const [articleResponse, summaryResponse] = await Promise.all([
    fetcher(articleUrl, databaseRequest(key)),
    fetcher(summaryUrl, databaseRequest(key)),
  ]);
  const articles = await readJson<
    Array<{
      id: string;
      title: string;
      url: string;
      excerpt: string | null;
      published_at: string | null;
      category: string | null;
      tags: string[] | null;
      source: { title: string | null } | { title: string | null }[] | null;
    }>
  >(articleResponse);
  if (articles.length === 0) return null;

  const article = articles[0];
  let summaryRows: SummaryJobRow[] = [];
  if (summaryResponse.ok) {
    try {
      summaryRows = await summaryResponse.json() as SummaryJobRow[];
    } catch {
      // Summary data is optional; keep the public article readable if it is malformed.
    }
  }
  const current = summaryRows.find((row) =>
    row.prompt_version === SUMMARY_VERSIONS[0]
  );
  const legacy = summaryRows.find((row) =>
    row.prompt_version === SUMMARY_VERSIONS[1]
  );
  const earliest = summaryRows.find((row) =>
    row.prompt_version === SUMMARY_VERSIONS[2]
  );
  const isReady = (row: SummaryJobRow | undefined) =>
    row?.status === "ready" && Array.isArray(row.key_points);
  const selected = isReady(current)
    ? current
    : isReady(legacy)
    ? legacy
    : isReady(earliest)
    ? earliest
    : current;
  const summaryStatus = selected && SUMMARY_STATUSES.has(selected.status)
    ? selected.status as
      | "pending"
      | "processing"
      | "ready"
      | "unavailable"
      | "failed"
    : null;
  const hasReadySummary = summaryStatus === "ready" &&
    Array.isArray(selected?.key_points);
  const summary = hasReadySummary
    ? {
      lead: selected?.lead ?? "",
      keyPoints: (selected?.key_points ?? []).filter((point): point is string =>
        typeof point === "string"
      ),
    }
    : null;
  const summaryBasis = !summary
    ? null
    : selected?.prompt_version === SUMMARY_VERSIONS[2]
    ? "excerpt"
    : selected?.extraction_status === "partial"
    ? "partial_article"
    : "full_article";
  const source = Array.isArray(article.source)
    ? article.source[0] ?? null
    : article.source;

  return {
    id: article.id,
    title: article.title,
    url: article.url,
    excerpt: article.excerpt,
    publishedAt: article.published_at,
    category: article.category ?? "general",
    tags: article.tags ?? [],
    sourceTitle: source?.title ?? null,
    summary,
    summaryBasis,
    summaryStatus,
    summaryGeneratedAt: selected?.generated_at ?? null,
  };
}

export function createIntossHandler(
  env: IntossApiEnvironment,
  fetcher: typeof fetch = fetch,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const origin = request.headers.get("origin");
    if (origin && !getAllowedOrigins(env).has(origin)) {
      return withCors(request, new Response("Forbidden", { status: 403 }), env);
    }
    if (request.method === "OPTIONS") {
      return withCors(request, new Response(null, { status: 204 }), env);
    }

    const url = new URL(request.url);
    const marker = "/techgotgan-intoss-api";
    const markerIndex = url.pathname.lastIndexOf(marker);
    const path = markerIndex < 0
      ? ""
      : url.pathname.slice(markerIndex + marker.length);

    try {
      if (request.method === "GET" && path === "/feed") {
        const sourceId = url.searchParams.get("source") ?? undefined;
        if (sourceId && !ARTICLE_ID_PATTERN.test(sourceId)) {
          return json(request, env, { error: "기업 블로그를 찾을 수 없어요." }, 400);
        }
        const feed = await getFeed(env, fetcher, sourceId);
        return json(
          request,
          env,
          feed,
          200,
          "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
        );
      }

      if (request.method === "GET" && path === "/publishers") {
        const publishers = await getPublishers(env, fetcher);
        return json(request, env, publishers, 200, "public, max-age=0, s-maxage=300, stale-while-revalidate=900");
      }

      if (request.method === "GET" && path === "/digest/weeks") {
        const weeks = await getDigestWeeks(env, fetcher);
        return json(request, env, weeks, 200, "public, max-age=0, s-maxage=900, stale-while-revalidate=1800");
      }

      const digestMatch = path.match(/^\/digest\/([^/]+)$/);
      if (request.method === "GET" && digestMatch) {
        const digest = await getDigest(env, fetcher, digestMatch[1]);
        if (!digest) return json(request, env, { error: "주간 큐레이션을 찾을 수 없어요." }, 404);
        return json(request, env, digest, 200, "public, max-age=0, s-maxage=300, stale-while-revalidate=900");
      }

      if (request.method === "POST" && path === "/search") {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json(request, env, { error: "검색어를 확인해 주세요." }, 400);
        }
        const query =
          typeof body === "object" && body !== null && "query" in body &&
            typeof body.query === "string"
            ? body.query.trim()
            : "";
        const queryLength = Array.from(query).length;
        if (queryLength < 2 || queryLength > 80) {
          return json(request, env, {
            error: "검색어는 2자 이상 80자 이하로 입력해 주세요.",
          }, 400);
        }
        const rows = await searchArticles(env, fetcher, query);
        const articles = rows.slice(0, 100).map((row) => ({
          id: row.id,
          title: row.title,
          url: row.url,
          excerpt: row.excerpt,
          thumbnail_url: row.thumbnail_url,
          published_at: row.published_at,
          click_count: row.click_count,
          category: row.category ?? "general",
          tags: row.tags ?? [],
          source: {
            id: row.source_id,
            title: row.source_title,
            site_url: row.source_site_url,
            favicon_url: row.source_favicon_url,
          },
        }));
        return json(request, env, articles);
      }

      const articleMatch = path.match(/^\/articles\/([^/]+)$/);
      if (request.method === "GET" && articleMatch) {
        const id = articleMatch[1];
        if (!ARTICLE_ID_PATTERN.test(id)) {
          return json(request, env, { error: "글을 찾을 수 없어요." }, 404);
        }
        const article = await getArticle(env, fetcher, id);
        if (!article) {
          return json(request, env, { error: "글을 찾을 수 없어요." }, 404);
        }
        return json(
          request,
          env,
          article,
          200,
          "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
        );
      }

      return json(
        request,
        env,
        { error: "요청한 경로를 찾을 수 없어요." },
        404,
      );
    } catch (error) {
      console.error(
        "Techgotgan App-in-Toss API failed:",
        error instanceof Error ? error.message : "unknown_error",
      );
      return json(request, env, { error: "글을 불러오지 못했어요." }, 503);
    }
  };
}
