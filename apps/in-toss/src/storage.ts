import type { Article } from "./types";

const SAVED_KEY = "techgotgan-intoss-saved-v1";
const READ_KEY = "techgotgan-intoss-read-v1";

function loadIds(key: string): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? new Set(value.filter((id): id is string => typeof id === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function isStoredArticle(value: unknown): value is Article {
  if (typeof value !== "object" || value === null) return false;
  const article = value as Partial<Article>;
  return typeof article.id === "string"
    && typeof article.title === "string"
    && typeof article.url === "string"
    && (article.excerpt === null || typeof article.excerpt === "string")
    && (article.published_at === null || typeof article.published_at === "string")
    && typeof article.category === "string"
    && Array.isArray(article.tags)
    && article.tags.every((tag) => typeof tag === "string")
    && (article.source === null || typeof article.source === "object" && !Array.isArray(article.source));
}

export function loadSavedArticles(): Map<string, Article> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    if (!Array.isArray(value)) return new Map();
    return new Map(
      value.filter(isStoredArticle).map((article) => [article.id, article]),
    );
  } catch {
    return new Map();
  }
}

export function loadReadIds(): Set<string> {
  return loadIds(READ_KEY);
}

export function saveSavedArticles(articles: Map<string, Article>): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify([...articles.values()]));
  } catch {
    // Keep the current screen usable when local storage is unavailable or full.
  }
}

export function saveReadIds(ids: Set<string>): void {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    // Keep the current screen usable when local storage is unavailable or full.
  }
}
