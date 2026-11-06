import "server-only";
import { CATEGORIES, type ArticleCategory } from "@/lib/categories";
import { getCachedArticlesForSource, type ArticleListItem } from "@/lib/data/articles";
import { listSources, type Source } from "@/lib/data/sources";
import { fetchCachedFromSupabase, fetchCachedRpcFromSupabase } from "@/lib/supabase/cached-rest";
import { SITE_URL } from "@/app/seo";

const MAX_HUB_ARTICLES = 20;

export { SITE_URL };

export const PUBLIC_CATEGORY_IDS = CATEGORIES.filter((category) => category.id !== "all").map(
  (category) => category.id
) as ArticleCategory[];

export interface PublicCategoryMeta {
  label: string;
  title: string;
  description: string;
}

export interface PublicTechnologyTermMeta {
  slug: string;
  label: string;
  tag: string;
  query: string;
  category: ArticleCategory;
  title: string;
  description: string;
}

export interface PublicTechnologyHub {
  term: PublicTechnologyTermMeta;
  articles: PublicHubArticle[];
  lastModified: string | null;
}

export interface PublicTechnologyIndexItem {
  term: PublicTechnologyTermMeta;
  articleCount: number;
  lastModified: string | null;
}

const MIN_PUBLIC_TECHNOLOGY_ARTICLES = 3;
const MAX_PUBLIC_TECHNOLOGY_ARTICLES = 20;

export const PUBLIC_TECHNOLOGY_TERMS: PublicTechnologyTermMeta[] = [
  {
    slug: "react",
    label: "React",
    tag: "react",
    query: "react",
    category: "frontend",
    title: "React(리액트) 기술 블로그 최신 글",
    description: "React(리액트) 컴포넌트, 렌더링, 상태 관리와 제품 적용 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "nextjs",
    label: "Next.js",
    tag: "nextjs",
    query: "nextjs",
    category: "frontend",
    title: "Next.js 기술 블로그 최신 글",
    description: "Next.js(넥스트.js) 렌더링, 라우팅, 캐시와 웹 서비스 운영 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "typescript",
    label: "TypeScript",
    tag: "typescript",
    query: "typescript",
    category: "frontend",
    title: "TypeScript 기술 블로그 최신 글",
    description: "TypeScript(타입스크립트) 타입 설계와 JavaScript 제품 개발 경험을 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "css",
    label: "CSS",
    tag: "css",
    query: "css",
    category: "frontend",
    title: "CSS 기술 블로그 최신 글",
    description: "CSS, 디자인 시스템과 웹 화면 구현·성능 개선 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "spring",
    label: "Spring",
    tag: "spring",
    query: "spring",
    category: "backend",
    title: "Spring(스프링) 기술 블로그 최신 글",
    description: "Spring(스프링)과 Java 서버 개발, API 설계와 서비스 운영 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "kubernetes",
    label: "Kubernetes",
    tag: "k8s",
    query: "kubernetes",
    category: "devops",
    title: "Kubernetes(쿠버네티스) 기술 블로그 최신 글",
    description: "Kubernetes(쿠버네티스, K8s) 기반 배포, 컨테이너 운영과 인프라 개선 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "docker",
    label: "Docker",
    tag: "docker",
    query: "docker",
    category: "devops",
    title: "Docker 기술 블로그 최신 글",
    description: "Docker 컨테이너를 이용한 개발 환경, 빌드와 서비스 배포 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "llm",
    label: "LLM",
    tag: "llm",
    query: "llm",
    category: "ai_ml",
    title: "LLM 기술 블로그 최신 글",
    description: "대규모 언어 모델(LLM)의 제품 적용, 추론, 평가와 운영 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "rag",
    label: "RAG",
    tag: "rag",
    query: "rag",
    category: "ai_ml",
    title: "RAG 기술 블로그 최신 글",
    description: "검색 증강 생성(RAG), 임베딩과 지식 검색 구현 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "agent",
    label: "AI 에이전트",
    tag: "agent",
    query: "agent",
    category: "ai_ml",
    title: "AI 에이전트 기술 블로그 최신 글",
    description: "도구를 사용하고 작업을 수행하는 AI 에이전트(Agent)의 구현·평가·운영 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "cloud",
    label: "클라우드",
    tag: "cloud",
    query: "cloud",
    category: "devops",
    title: "클라우드 기술 블로그 최신 글",
    description: "AWS·GCP 등 클라우드 인프라와 비용·안정성 개선 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "cicd",
    label: "CI/CD",
    tag: "cicd",
    query: "cicd",
    category: "devops",
    title: "CI/CD 기술 블로그 최신 글",
    description: "지속적 통합·배포(Continuous Integration/Continuous Delivery) 파이프라인과 개발 자동화 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "spark",
    label: "Apache Spark",
    tag: "spark",
    query: "spark",
    category: "data",
    title: "Apache Spark(스파크) 기술 블로그 최신 글",
    description: "Apache Spark(스파크)를 활용한 대규모 데이터 처리와 분석 파이프라인 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "sql",
    label: "SQL",
    tag: "sql",
    query: "sql",
    category: "data",
    title: "SQL 기술 블로그 최신 글",
    description: "SQL 쿼리, 데이터 모델링과 분석·서비스 운영 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "database",
    label: "데이터베이스",
    tag: "db",
    query: "database",
    category: "backend",
    title: "데이터베이스(DB) 기술 블로그 최신 글",
    description: "관계형·비관계형 데이터베이스(DB)의 스키마, 쿼리와 안정적인 운영 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "go",
    label: "Go",
    tag: "go",
    query: "go",
    category: "backend",
    title: "Go(Golang) 기술 블로그 최신 글",
    description: "Go(Golang) 언어로 구현한 서버, 분산 시스템과 개발 도구 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "cross-platform",
    label: "크로스 플랫폼 앱",
    tag: "cross-platform",
    query: "cross-platform",
    category: "mobile",
    title: "크로스 플랫폼 앱 기술 블로그 최신 글",
    description: "Flutter와 React Native 등 여러 모바일 플랫폼을 함께 지원하는 앱 개발 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "ios",
    label: "iOS",
    tag: "ios",
    query: "ios",
    category: "mobile",
    title: "iOS 기술 블로그 최신 글",
    description: "Swift와 iOS 앱 개발, 모바일 제품 운영 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "android",
    label: "Android",
    tag: "android",
    query: "android",
    category: "mobile",
    title: "Android(안드로이드) 기술 블로그 최신 글",
    description: "Android(안드로이드) 앱, Kotlin과 모바일 제품 개발·운영 사례를 다룬 회사 기술 블로그 글입니다.",
  },
  {
    slug: "kafka",
    label: "Kafka",
    tag: "kafka",
    query: "kafka",
    category: "data",
    title: "Kafka 기술 블로그 최신 글",
    description: "Apache Kafka(카프카) 기반 이벤트 스트리밍, 데이터 파이프라인과 운영 사례를 다룬 회사 기술 블로그 글입니다.",
  },
];

// 검색어가 가리키는 주제와 페이지의 실제 내용을 맞추기 위해 카테고리별 설명을 따로 둔다.
// id는 수집 파이프라인이 저장하는 표준 category 값과 동일하다.
export const PUBLIC_CATEGORY_META: Record<ArticleCategory, PublicCategoryMeta> = {
  frontend: {
    label: "Frontend",
    title: "프론트엔드 기술 블로그 최신 글",
    description: "기업 기술 블로그에서 React, 웹 플랫폼, 디자인 시스템과 프론트엔드 개발 경험에 관한 최신 글을 모았습니다.",
  },
  backend: {
    label: "Backend",
    title: "백엔드 기술 블로그 최신 글",
    description: "기업 기술 블로그에서 서버, API, 데이터베이스와 안정적인 서비스 운영을 다루는 최신 백엔드 글을 모았습니다.",
  },
  ai_ml: {
    label: "AI / ML",
    title: "AI·머신러닝 기술 블로그 최신 글",
    description: "기업 테크 블로그에서 생성형 AI, 머신러닝 모델과 데이터 기반 제품 개발에 관한 최신 글을 모았습니다.",
  },
  devops: {
    label: "DevOps",
    title: "DevOps 기술 블로그 최신 글",
    description: "기업 기술 블로그에서 클라우드, 인프라, 배포 자동화와 신뢰성 있는 운영에 관한 최신 글을 모았습니다.",
  },
  mobile: {
    label: "Mobile",
    title: "모바일 개발 관련 기술 블로그 최신 글",
    description: "기업 기술 블로그에서 iOS, Android, 크로스 플랫폼과 모바일 제품 개발에 관한 최신 글을 모았습니다.",
  },
  data: {
    label: "Data",
    title: "데이터 기술 블로그 최신 글",
    description: "기업 기술 블로그에서 데이터 엔지니어링, 분석, 실험과 데이터 플랫폼에 관한 최신 글을 모았습니다.",
  },
  culture: {
    label: "Culture",
    title: "개발 문화 관련 기술 블로그 최신 글",
    description: "팀의 일하는 방식, 커리어, 협업과 기술 조직 문화에 관한 최신 글을 모았습니다.",
  },
  general: {
    label: "General",
    title: "테크 블로그 최신 글",
    description: "특정 주제로 분류되지 않은 기업 기술 블로그의 기술 소식과 개발 이야기를 모았습니다.",
  },
};

export interface PublicHubArticle {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  publishedAt: string | null;
  discoveredAt: string | null;
  category: ArticleCategory;
  source: {
    title: string;
    slug: string;
  } | null;
}

export interface PublicCategoryHub {
  category: ArticleCategory;
  meta: PublicCategoryMeta;
  articles: PublicHubArticle[];
  lastModified: string | null;
}

export interface PublicCategoryIndexItem {
  category: ArticleCategory;
  meta: PublicCategoryMeta;
  articleCount: number;
  lastModified: string | null;
}

export interface PublicBlogHub {
  source: Source;
  slug: string;
  host: string;
  displayName: string;
  articles: PublicHubArticle[];
  categories: ArticleCategory[];
}

export interface PublicBlogIndexItem {
  slug: string;
  displayName: string;
  host: string;
  latestArticleTitle: string | null;
  hasArticles: boolean;
  lastModified: string | null;
}

function hostFromUrl(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
  }
}

function publicSourceDisplayName(source: Pick<Source, "title" | "site_url">): string {
  const host = hostFromUrl(source.site_url);
  if (host === "yozm.wishket.com") return "요즘IT";
  return source.title?.trim() || host;
}

function slugPart(value: string): string {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "blog";
}

/**
 * UUID처럼 관리용 식별자를 URL에 노출하지 않고, 방문자가 이해할 수 있는 제목과 호스트만으로
 * 같은 소스에 언제나 같은 공개 주소를 만든다. 호스트가 함께 들어가 제목이 같은 블로그도 구분된다.
 */
export function getPublicSourceSlug(source: Pick<Source, "title" | "site_url">): string {
  const host = hostFromUrl(source.site_url);
  const title = source.title?.trim() || host;
  const titlePart = slugPart(title);
  const hostPart = slugPart(host);
  return titlePart === hostPart ? hostPart : `${titlePart}-${hostPart}`;
}

function matchesPublicSourceSlug(source: Source, requestedSlug: string): boolean {
  const publicSlug = getPublicSourceSlug(source);
  if (publicSlug === requestedSlug) return true;

  // Vercel may pass a percent-encoded dynamic path parameter through to the page.
  // Compare its decoded form too so non-ASCII slugs (for example Korean blog names)
  // resolve consistently with the URLs emitted by the sitemap and blog index.
  if (!/%[\da-f]{2}/i.test(requestedSlug)) return false;
  try {
    return publicSlug === decodeURIComponent(requestedSlug);
  } catch {
    return false;
  }
}

export function isPublicCategory(value: string): value is ArticleCategory {
  return PUBLIC_CATEGORY_IDS.includes(value as ArticleCategory);
}

function toPublicArticle(
  article: Omit<ArticleListItem, "is_read" | "is_favorite">,
  sourceSlugs: Map<string, string>
): PublicHubArticle {
  const category = isPublicCategory(article.category) ? article.category : "general";
  const sourceTitle = article.source
    ? publicSourceDisplayName({ title: article.source.title, site_url: article.source.site_url })
    : null;

  return {
    id: article.id,
    title: article.title,
    url: article.url,
    excerpt: article.excerpt,
    publishedAt: article.published_at,
    discoveredAt: article.discovered_at ?? null,
    category,
    source:
      article.source && sourceTitle
        ? {
            title: sourceTitle,
            slug: sourceSlugs.get(article.source.id) ?? getPublicSourceSlug(article.source),
          }
        : null,
  };
}

interface PublicBlogIndexRow {
  source_id: string;
  latest_article_title: string | null;
  has_articles: boolean;
  last_modified: string | null;
}

interface PublicCategoryIndexRow {
  category_id: string;
  article_count: number;
  last_modified: string | null;
}

interface PublicCategoryArticleRow {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  published_at: string | null;
  discovered_at: string | null;
  category: string;
  source_id: string;
  source_title: string | null;
  source_site_url: string;
}

export async function getPublicBlogIndex(): Promise<PublicBlogIndexItem[]> {
  const [allSources, articleIndex] = await Promise.all([
    listSources(),
    fetchCachedRpcFromSupabase<PublicBlogIndexRow[]>("get_public_blog_index", {}, {
      revalidate: 60,
      tags: ["articles", "sources"],
    }),
  ]);
  const sources = allSources.filter((source) => source.is_active);
  const latestBySource = new Map(articleIndex.map((row) => [row.source_id, row]));

  return sources
    .map((source) => {
      const latestArticle = latestBySource.get(source.id);
      return {
        slug: getPublicSourceSlug(source),
        displayName: publicSourceDisplayName(source),
        host: hostFromUrl(source.site_url),
        latestArticleTitle: latestArticle?.latest_article_title ?? null,
        hasArticles: latestArticle?.has_articles ?? false,
        lastModified: latestArticle?.last_modified ?? null,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
}

export async function getPublicCategoryIndex(): Promise<PublicCategoryIndexItem[]> {
  const rows = await fetchCachedRpcFromSupabase<PublicCategoryIndexRow[]>("get_public_category_index", {}, {
    revalidate: 60,
    tags: ["articles", "sources"],
  });
  const byCategory = new Map(rows.map((row) => [row.category_id, row]));

  return PUBLIC_CATEGORY_IDS.flatMap((category) => {
    const row = byCategory.get(category);
    return row
      ? [{ category, meta: PUBLIC_CATEGORY_META[category], articleCount: Number(row.article_count), lastModified: row.last_modified }]
      : [];
  });
}

interface PublicTechnologyArticleRow {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  published_at: string | null;
  discovered_at: string | null;
  category: string;
  tags: string[] | null;
  source: {
    id: string;
    title: string | null;
    site_url: string;
  };
}

export function isPublicTechnologyTerm(value: string): boolean {
  return PUBLIC_TECHNOLOGY_TERMS.some((term) => term.slug === value);
}

export async function getPublicTechnologyHub(slug: string): Promise<PublicTechnologyHub | null> {
  const term = PUBLIC_TECHNOLOGY_TERMS.find((item) => item.slug === slug);
  if (!term) return null;

  const rows = await fetchCachedFromSupabase<PublicTechnologyArticleRow[]>(
    "articles",
    {
      select: "id,title,url,excerpt,published_at,discovered_at,category,tags,source:sources!inner(id,title,site_url)",
      tags: `cs.{${term.tag}}`,
      "source.is_active": "eq.true",
      order: "published_at.desc.nullslast,discovered_at.desc",
      limit: String(MAX_PUBLIC_TECHNOLOGY_ARTICLES),
    },
    { revalidate: 300, tags: ["articles", "sources"] }
  );

  const articles = rows
    .filter((row) => row.tags?.some((tag) => tag.toLowerCase() === term.tag))
    .map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      excerpt: row.excerpt,
      publishedAt: row.published_at,
      discoveredAt: row.discovered_at,
      category: isPublicCategory(row.category) ? row.category : "general",
      source: {
        title: publicSourceDisplayName(row.source),
        slug: getPublicSourceSlug(row.source),
      },
    } satisfies PublicHubArticle));

  const lastModified = articles.reduce<string | null>((latest, article) => {
    const candidate = article.discoveredAt ?? article.publishedAt;
    return candidate && (!latest || Date.parse(candidate) > Date.parse(latest)) ? candidate : latest;
  }, null);

  return { term, articles, lastModified };
}

export async function getPublicTechnologyIndex(): Promise<PublicTechnologyIndexItem[]> {
  const hubs = await Promise.all(PUBLIC_TECHNOLOGY_TERMS.map((term) => getPublicTechnologyHub(term.slug)));
  return hubs.flatMap((hub) =>
    hub && hub.articles.length >= MIN_PUBLIC_TECHNOLOGY_ARTICLES
      ? [{ term: hub.term, articleCount: hub.articles.length, lastModified: hub.lastModified }]
      : []
  );
}

export async function getPublicCategoryHub(category: string): Promise<PublicCategoryHub | null> {
  if (!isPublicCategory(category)) return null;

  const [rows, sources] = await Promise.all([
    fetchCachedRpcFromSupabase<PublicCategoryArticleRow[]>("get_public_category_articles", {
      category_id: category,
      requested_limit: String(MAX_HUB_ARTICLES),
    }, { revalidate: 60, tags: ["articles", "sources"] }),
    listSources(),
  ]);
  const sourceSlugs = new Map(
    sources.filter((source) => source.is_active).map((source) => [source.id, getPublicSourceSlug(source)])
  );
  const articles = rows.map((article) => {
    const categoryId = isPublicCategory(article.category) ? article.category : "general";
    const sourceTitle = publicSourceDisplayName({
      title: article.source_title,
      site_url: article.source_site_url,
    });
    return {
      id: article.id,
      title: article.title,
      url: article.url,
      excerpt: article.excerpt,
      publishedAt: article.published_at,
      discoveredAt: article.discovered_at,
      category: categoryId,
      source: {
        title: sourceTitle,
        slug: sourceSlugs.get(article.source_id) ?? getPublicSourceSlug({
          title: article.source_title,
          site_url: article.source_site_url,
        }),
      },
    } satisfies PublicHubArticle;
  });

  const lastModified = articles.reduce<string | null>((latest, article) => {
    const candidate = article.discoveredAt ?? article.publishedAt;
    return candidate && (!latest || Date.parse(candidate) > Date.parse(latest)) ? candidate : latest;
  }, null);

  return {
    category,
    meta: PUBLIC_CATEGORY_META[category],
    articles,
    lastModified,
  };
}

export async function getPublicBlogHub(slug: string): Promise<PublicBlogHub | null> {
  const sources = (await listSources()).filter((source) => source.is_active);
  const source = sources.find((item) => matchesPublicSourceSlug(item, slug));
  if (!source) return null;

  const sourceArticles = await getCachedArticlesForSource(source.id, MAX_HUB_ARTICLES);
  const sourceSlugs = new Map(sources.map((item) => [item.id, getPublicSourceSlug(item)]));
  const categories = Array.from(
    new Set(sourceArticles.map((article) => (isPublicCategory(article.category) ? article.category : "general")))
  );

  return {
    source,
    slug: getPublicSourceSlug(source),
    host: hostFromUrl(source.site_url),
    displayName: publicSourceDisplayName(source),
    articles: sourceArticles.slice(0, MAX_HUB_ARTICLES).map((article) => toPublicArticle(article, sourceSlugs)),
    categories,
  };
}
