import Image from "next/image";
import type { ArticleFilter, ArticleListItem } from "@/lib/data/articles";
import { getCategoryMeta, type CategoryId } from "@/lib/categories";
import { HOME_STATIC_PREVIEW_LIMIT } from "@/lib/article-feed-constants";

export function ArticleListStaticPreview({
  articles,
  initialFilter,
  initialSourceId,
  initialCategory,
  initialView,
  deferFirstThumbnail,
}: {
  articles: ArticleListItem[];
  initialFilter: ArticleFilter;
  initialSourceId: string;
  initialCategory: CategoryId;
  initialView: "list" | "card";
  deferFirstThumbnail: boolean;
}) {
  const visibleArticles = articles.filter((article) => {
    if (initialFilter === "unread" && article.is_read) return false;
    if (initialFilter === "read" && !article.is_read) return false;
    if (initialFilter === "favorite" && !article.is_favorite) return false;
    if (initialSourceId !== "all" && article.source?.id !== initialSourceId) return false;
    if (initialCategory !== "all" && article.category !== initialCategory) return false;
    return true;
  }).slice(0, HOME_STATIC_PREVIEW_LIMIT);

  return (
    <div aria-busy="true" aria-label="목록 기능을 불러오는 중">
      <div className="article-feed-controls" aria-hidden="true">
        <div className="skeleton" style={{ width: 180, height: 40, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 112, height: 40, borderRadius: 8 }} />
      </div>
      <div className="article-topic-controls" aria-hidden="true" style={{ gap: 6 }}>
        {[72, 80, 74, 78, 72, 68].map((width, index) => (
          <div key={index} className="skeleton" style={{ width, height: 30, borderRadius: 16 }} />
        ))}
      </div>
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
            <a href={href} data-article-link="true" className="article-row-link">
              <h3>{article.title}</h3>
            </a>
            {article.excerpt && (
              <a href={href} data-article-link="true" className="article-row-excerpt">
                <p>{article.excerpt}</p>
              </a>
            )}
            <time className="article-row-date" dateTime={article.published_at ?? undefined}>
              {formatDate(article.published_at)}
            </time>
          </div>
          {article.thumbnail_url && (
            <a href={href} data-article-link="true" className="article-row-thumb">
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
