export const ARTICLE_PAGE_SIZE_OPTIONS = [10, 30, 50] as const;
export type ArticlePageSize = (typeof ARTICLE_PAGE_SIZE_OPTIONS)[number];
// Keep the static first page aligned with every available page-size option.
export const HOME_STATIC_PREVIEW_LIMIT = Math.max(...ARTICLE_PAGE_SIZE_OPTIONS);
export const ARTICLE_VIEW_COOKIE = "techgotgan-article-view";
