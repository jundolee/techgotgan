import type { Article, ArticleDetail, DigestWeek, Publisher, WeeklyDigest } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_FUNCTION_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/techgotgan-intoss-api`
  : null;
const API_BASE_URL = (
  import.meta.env.VITE_TECHGOTGAN_API_URL
  || SUPABASE_FUNCTION_URL
  || ""
).replace(/\/$/, "");
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const USE_SUPABASE_FUNCTION = API_BASE_URL.endsWith("/functions/v1/techgotgan-intoss-api");

function apiHeaders(contentType?: string): Headers {
  const headers = new Headers();
  if (contentType) headers.set("Content-Type", contentType);
  if (USE_SUPABASE_FUNCTION && SUPABASE_PUBLISHABLE_KEY) {
    headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
  }
  return headers;
}

function apiUrl(path: string): string {
  if (!API_BASE_URL) throw new TypeError("App API is not configured");
  return `${API_BASE_URL}${path}`;
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
    return new Error(body.error);
  }
  return new Error(fallback);
}

export async function fetchFeed(signal?: AbortSignal, publisherId?: string): Promise<Article[]> {
  const url = new URL(apiUrl(USE_SUPABASE_FUNCTION ? "/feed" : "/api/intoss/feed"));
  if (publisherId) url.searchParams.set("source", publisherId);
  const response = await fetch(url, {
    headers: apiHeaders(),
    signal,
  });
  if (!response.ok) throw await readError(response, "최신 글을 불러오지 못했어요.");
  return response.json() as Promise<Article[]>;
}

export async function fetchPublishers(signal?: AbortSignal): Promise<Publisher[]> {
  const response = await fetch(apiUrl(USE_SUPABASE_FUNCTION ? "/publishers" : "/api/intoss/publishers"), {
    headers: apiHeaders(),
    signal,
  });
  if (!response.ok) throw await readError(response, "기업 블로그 목록을 불러오지 못했어요.");
  return response.json() as Promise<Publisher[]>;
}

export async function fetchDigestWeeks(signal?: AbortSignal): Promise<DigestWeek[]> {
  const response = await fetch(apiUrl(USE_SUPABASE_FUNCTION ? "/digest/weeks" : "/api/intoss/digest/weeks"), {
    headers: apiHeaders(),
    signal,
  });
  if (!response.ok) throw await readError(response, "주간 큐레이션을 불러오지 못했어요.");
  return response.json() as Promise<DigestWeek[]>;
}

export async function fetchDigest(week: string, signal?: AbortSignal): Promise<WeeklyDigest> {
  const path = USE_SUPABASE_FUNCTION
    ? `/digest/${encodeURIComponent(week)}`
    : `/api/intoss/digest/${encodeURIComponent(week)}`;
  const response = await fetch(apiUrl(path), { headers: apiHeaders(), signal });
  if (!response.ok) throw await readError(response, "주간 큐레이션을 불러오지 못했어요.");
  return response.json() as Promise<WeeklyDigest>;
}

export async function searchFeed(query: string, signal?: AbortSignal): Promise<Article[]> {
  const endpoint = apiUrl(USE_SUPABASE_FUNCTION ? "/search" : "/api/intoss/search");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: apiHeaders("application/json"),
    body: JSON.stringify({ query }),
    signal,
  });
  if (!response.ok) throw await readError(response, "검색 결과를 불러오지 못했어요.");
  return response.json() as Promise<Article[]>;
}

export async function fetchArticle(id: string, signal?: AbortSignal): Promise<ArticleDetail> {
  const path = USE_SUPABASE_FUNCTION
    ? `/articles/${encodeURIComponent(id)}`
    : `/api/intoss/articles/${encodeURIComponent(id)}`;
  const response = await fetch(apiUrl(path), { headers: apiHeaders(), signal });
  if (!response.ok) throw await readError(response, "글을 불러오지 못했어요.");
  return response.json() as Promise<ArticleDetail>;
}
