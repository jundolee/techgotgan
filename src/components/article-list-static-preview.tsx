import Image from "next/image";
import { markAllArticlesReadFormAction, setArticleViewPreferenceAction } from "@/app/articles/actions";
import type { ArticleFilter, ArticleListItem } from "@/lib/data/articles";
import { CATEGORIES, getCategoryMeta, type CategoryId } from "@/lib/categories";
import { ARTICLE_PAGE_SIZE_OPTIONS, HOME_STATIC_PREVIEW_LIMIT, type ArticlePageSize } from "@/lib/article-feed-constants";
import { ArticleListControlsSkeleton } from "@/components/article-list-skeleton";

type StaticSourceOption = { id: string; label: string; faviconUrl?: string | null };

const STATIC_FILTERS: { value: ArticleFilter; label: string }[] = [
  { value: "all", label: "모든 글" },
  { value: "unread", label: "읽지 않은 글" },
  { value: "read", label: "읽은 글" },
  { value: "favorite", label: "저장한 글" },
];

function browseHref(filter: ArticleFilter, sourceId: string, category: CategoryId, pageSize: ArticlePageSize) {
  const params = new URLSearchParams();
  if (filter !== "unread") params.set("filter", filter);
  if (sourceId !== "all") params.set("source", sourceId);
  if (category !== "all") params.set("category", category);
  if (pageSize !== 30) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function StaticFilterLinks({
  filter,
  sourceId,
  category,
  pageSize,
}: {
  filter: ArticleFilter;
  sourceId: string;
  category: CategoryId;
  pageSize: ArticlePageSize;
}) {
  return (
    <nav className="article-status-tabs article-static-filter-tabs" aria-label="글 필터">
      <div className="article-status-tabs-list article-static-filter-tabs-list">
        {STATIC_FILTERS.map((option) => (
          <a
            key={option.value}
            href={browseHref(option.value, sourceId, category, pageSize)}
            className="article-static-filter-tab"
            aria-current={filter === option.value ? "page" : undefined}
          >
            {option.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function StaticCategoryLinks({
  filter,
  sourceId,
  selectedCategory,
  pageSize,
}: {
  filter: ArticleFilter;
  sourceId: string;
  selectedCategory: CategoryId;
  pageSize: ArticlePageSize;
}) {
  return (
    <div className="article-topic-controls">
      <div className="category-filter-scroll-shell">
        <nav className="category-filter-scroll" aria-label="글 주제" tabIndex={0}>
          <div className="category-filter-scroll-content">
            {CATEGORIES.map((category) => (
              <a
                key={category.id}
                href={browseHref(filter, sourceId, category.id, pageSize)}
                className="article-static-category-chip"
                aria-current={selectedCategory === category.id ? "page" : undefined}
              >
                {category.label}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

function StaticBulkControls({
  filter,
  sourceId,
  category,
  view,
  pageSize,
  sources,
}: {
  filter: ArticleFilter;
  sourceId: string;
  category: CategoryId;
  view: "list" | "card";
  pageSize: ArticlePageSize;
  sources: StaticSourceOption[];
}) {
  const selectedSource = sources.find((source) => source.id === sourceId);
  const sourceLabel = sourceId === "all" ? "전체 블로그" : selectedSource?.label ?? "블로그 선택";

  return (
    <div className="article-bulk-actions article-static-bulk-actions">
      <div className="article-list-preferences">
        <form action={setArticleViewPreferenceAction} className="article-view-switch" role="group" aria-label="글 보기 방식" data-deferred-feed-navigation>
          <input type="hidden" name="pageSize" value={pageSize} />
          <button type="submit" name="view" value="list" aria-pressed={view === "list"}>리스트</button>
          <button type="submit" name="view" value="card" aria-pressed={view === "card"}>카드</button>
        </form>

        <details className="article-static-source-filter" data-deferred-feed-control>
          <summary className="source-filter-trigger article-static-source-trigger" aria-label="블로그 선택">
            <span className="source-filter-trigger-label">{sourceLabel}</span>
            <span aria-hidden="true">⌄</span>
          </summary>
          <div className="article-static-source-menu">
            <a href={browseHref(filter, "all", category, pageSize)} aria-current={sourceId === "all" ? "page" : undefined}>
              전체 블로그
            </a>
            {sources.map((source) => (
              <a
                key={source.id}
                href={browseHref(filter, source.id, category, pageSize)}
                aria-current={sourceId === source.id ? "page" : undefined}
              >
                {source.label}
              </a>
            ))}
          </div>
        </details>

        <details className="article-static-page-size" data-deferred-feed-control>
          <summary className="article-static-page-size-trigger" aria-label={`한 페이지에 ${pageSize}개 글 표시`}>
            <span>{pageSize}개</span>
            <span aria-hidden="true">⌄</span>
          </summary>
          <div className="article-static-page-size-menu">
            {ARTICLE_PAGE_SIZE_OPTIONS.map((size) => (
              <a
                key={size}
                href={browseHref(filter, sourceId, category, size)}
                aria-current={pageSize === size ? "page" : undefined}
              >
                {size}개
              </a>
            ))}
          </div>
        </details>
      </div>

      <form action={markAllArticlesReadFormAction} data-deferred-feed-navigation>
        <input type="hidden" name="pageSize" value={pageSize} />
        <button type="submit" className="article-static-read-all">모두 읽음</button>
      </form>
    </div>
  );
}

export function ArticleListStaticPreview({
  articles,
  sources,
  initialFilter,
  initialSourceId,
  initialCategory,
  initialView,
  initialPageSize,
  deferFirstThumbnail,
}: {
  articles: ArticleListItem[];
  sources: StaticSourceOption[];
  initialFilter: ArticleFilter;
  initialSourceId: string;
  initialCategory: CategoryId;
  initialView: "list" | "card";
  initialPageSize: ArticlePageSize;
  deferFirstThumbnail: boolean;
}) {
  const visibleArticles = articles.filter((article) => {
    if (initialFilter === "unread" && article.is_read) return false;
    if (initialFilter === "read" && !article.is_read) return false;
    if (initialFilter === "favorite" && !article.is_favorite) return false;
    if (initialSourceId !== "all" && article.source?.id !== initialSourceId) return false;
    if (initialCategory !== "all" && article.category !== initialCategory) return false;
    return true;
  }).slice(0, Math.min(HOME_STATIC_PREVIEW_LIMIT, initialPageSize));

  return (
    <div>
      <ArticleListControlsSkeleton
        filterControl={<StaticFilterLinks filter={initialFilter} sourceId={initialSourceId} category={initialCategory} pageSize={initialPageSize} />}
        categoryControl={<StaticCategoryLinks filter={initialFilter} sourceId={initialSourceId} selectedCategory={initialCategory} pageSize={initialPageSize} />}
        bulkControl={
          <StaticBulkControls
            filter={initialFilter}
            sourceId={initialSourceId}
            category={initialCategory}
            view={initialView}
            pageSize={initialPageSize}
            sources={sources}
          />
        }
      />
      {visibleArticles.length > 0 ? (
        <ul className={`article-card-grid${initialView === "list" ? " is-list-view" : ""}`}>
          {visibleArticles.map((article, index) => (
            <StaticArticleRow
              key={article.id}
              article={article}
              priority={index === 0 && !deferFirstThumbnail}
              thumbnailSizes={initialView === "list"
                ? "(max-width: 640px) 88px, 120px"
                : "(max-width: 420px) calc(100vw - 58px), (max-width: 640px) calc((100vw - 96px) / 2), calc((min(100vw, 720px) - 174px) / 3)"}
            />
          ))}
        </ul>
      ) : (
        <div className="skeleton" style={{ width: "100%", height: 180, borderRadius: 12 }} />
      )}
    </div>
  );
}

function StaticArticleRow({ article, priority, thumbnailSizes }: {
  article: ArticleListItem;
  priority: boolean;
  thumbnailSizes: string;
}) {
  const category = article.category && article.category !== "general" ? getCategoryMeta(article.category) : null;
  const href = `/articles/${encodeURIComponent(article.id)}`;
  const sourceBadgeClass = "seed-badge__root seed-badge__root--size_medium seed-badge__root--variant_weak seed-badge__root--tone_neutral-variant_weak";

  return (
    <li className={`article-row-item${article.is_read ? " is-read" : ""}`}>
      <div className="article-row-content">
        <div className="article-row-meta">
          <span className={sourceBadgeClass}>
            <span className="seed-badge__label article-row-source">
              {article.source?.favicon_url && (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary external favicon hosts
                <img src={article.source.favicon_url} alt="" width={14} height={14} loading="lazy" decoding="async" />
              )}
              <span>{article.source?.title ?? article.source?.site_url}</span>
            </span>
          </span>
          {category && (
            <a href={`/?category=${category.id}`} className="article-row-category">
              <span className={`seed-badge__root seed-badge__root--size_medium seed-badge__root--variant_outline seed-badge__root--tone_${category.badgeTone}-variant_outline`}>
                <span className="seed-badge__label">{category.label}</span>
              </span>
            </a>
          )}
          <div className="article-row-actions" aria-hidden="true">
            <span className="article-save-button"><span>☆</span></span>
          </div>
        </div>

        <div className={`article-row-main${article.thumbnail_url ? " has-thumbnail" : ""}`}>
          <div className="article-row-copy">
            <a href={href} data-article-link="true" data-article-source-url={article.url} className="article-row-link">
              <h3>{article.title}</h3>
            </a>
            {article.excerpt && (
              <a href={href} data-article-link="true" data-article-source-url={article.url} className="article-row-excerpt">
                <p>{article.excerpt}</p>
              </a>
            )}
            <time className="article-row-date" dateTime={article.published_at ?? undefined}>
              {formatDate(article.published_at)}
            </time>
          </div>
          {article.thumbnail_url && (
            <a href={href} data-article-link="true" data-article-source-url={article.url} className="article-row-thumb">
              <div className="seed-aspect-ratio article-row-thumb-aspect" style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "var(--seed-color-bg-neutral-weak)" }}>
                {isOptimizableThumbnail(article.thumbnail_url) ? (
                  <Image
                    src={article.thumbnail_url}
                    alt=""
                    fill
                    sizes={thumbnailSizes}
                    quality={75}
                    loading={priority ? "eager" : "lazy"}
                    fetchPriority={priority ? "high" : "auto"}
                    style={{ objectFit: "contain", opacity: article.is_read ? 0.85 : 1 }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- external source thumbnails stay unoptimized
                  <img src={article.thumbnail_url} alt="" loading="lazy" decoding="async"
                    style={{ width: "100%", height: "100%", objectFit: "contain", opacity: article.is_read ? 0.85 : 1 }} />
                )}
              </div>
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function isOptimizableThumbnail(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return (parsed.hostname.endsWith(".supabase.co") &&
      parsed.pathname.startsWith("/storage/v1/object/public/thumbnails/")) ||
      (parsed.hostname === "cdn-images-1.medium.com" && parsed.pathname.startsWith("/max/"));
  } catch {
    return false;
  }
}
