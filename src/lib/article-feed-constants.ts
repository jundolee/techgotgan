export const HOME_STATIC_PREVIEW_LIMIT = 30;
export const ARTICLE_PAGE_SIZE_OPTIONS = [10, 30, 50] as const;
export type ArticlePageSize = (typeof ARTICLE_PAGE_SIZE_OPTIONS)[number];
export const ARTICLE_VIEW_COOKIE = "techgotgan-article-view";
