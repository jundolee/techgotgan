import type { ReactNode } from "react";

const ROW_COUNT = 6;

/** Keep the loading controls in the same rows and columns as the live feed. */
export function ArticleListControlsSkeleton({
  filterControl,
  categoryControl,
}: {
  filterControl?: ReactNode;
  categoryControl?: ReactNode;
} = {}) {
  return (
    <>
      <div className="article-feed-controls">
        {filterControl ?? (
          <div className="article-status-tabs article-list-skeleton-tabs" aria-hidden="true">
            {[72, 102, 68, 82].map((width, index) => (
              <span key={index} className="skeleton" style={{ width, height: 32, borderRadius: 8 }} />
            ))}
          </div>
        )}
        {categoryControl ?? (
          <div className="article-topic-controls article-list-skeleton-topics" aria-hidden="true">
            {[58, 64, 54, 60, 58].map((width, index) => (
              <span key={index} className="skeleton" style={{ width, height: 30, borderRadius: 16 }} />
            ))}
          </div>
        )}
        <div className="article-search-shell" aria-hidden="true">
          <span className="skeleton" style={{ width: 40, height: 40, borderRadius: 8 }} />
        </div>
      </div>

      <div className="article-bulk-actions" aria-hidden="true">
        <div className="article-list-preferences article-list-skeleton-preferences">
          <span className="skeleton" style={{ width: 106, height: 36, borderRadius: 8 }} />
          <span className="skeleton article-list-skeleton-source" style={{ width: 142, height: 36, borderRadius: 8 }} />
          <span className="skeleton" style={{ width: 68, height: 36, borderRadius: 8 }} />
        </div>
        <span className="skeleton article-list-skeleton-read-all" style={{ width: 80, height: 36, borderRadius: 8 }} />
      </div>
    </>
  );
}

export function ArticleListSkeleton({ view = "card" }: { view?: "list" | "card" }) {
  return (
    <div aria-busy="true" aria-label="글 목록을 불러오는 중">
      <ArticleListControlsSkeleton />
      <ul className={`article-card-grid article-list-skeleton-grid${view === "list" ? " is-list-view" : ""}`} aria-hidden="true">
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <li key={index} className="article-row-item article-list-skeleton-item">
            <div className="article-row-content">
              <div className="article-row-meta">
                <span className="skeleton" style={{ width: 112, height: 24, borderRadius: 6 }} />
                <span className="skeleton article-list-skeleton-category" style={{ width: 58, height: 24, borderRadius: 6 }} />
                <span className="skeleton article-list-skeleton-action" style={{ width: 32, height: 32, borderRadius: 6 }} />
              </div>
              <div className="article-row-main has-thumbnail">
                <div className="article-row-copy article-list-skeleton-copy">
                  <span className="skeleton" style={{ width: "92%", height: 20 }} />
                  <span className="skeleton article-list-skeleton-title-line" style={{ width: "68%", height: 20 }} />
                  <span className="skeleton article-list-skeleton-excerpt" style={{ width: "88%", height: 14 }} />
                  <span className="skeleton article-list-skeleton-excerpt" style={{ width: "62%", height: 14 }} />
                  <span className="skeleton article-list-skeleton-date" style={{ width: 76, height: 12 }} />
                </div>
                <div className="article-row-thumb article-list-skeleton-thumb">
                  <div className="article-row-thumb-aspect skeleton" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
