import "server-only";
import { load } from "cheerio";

// Local-only fallback when database credentials are unavailable. These are the same
// public titles and related links already rendered by production; no cookies or summaries are read.
export async function getPublicGraphArticle(id: string) {
  const response = await fetch(`https://www.techgotgan.co.kr/articles/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!response.ok) return null;
  const $ = load(await response.text());
  const title = $("main h1").first().text().trim();
  if (!title) return null;
  const section = $('section[aria-labelledby="related-articles-heading"]');
  const semanticList = section.text().includes("AI 벡터 임베딩으로 분석한 기술적 연관 글");
  const related = section.find("li a").toArray().flatMap((element) => {
    const link = $(element);
    const match = link.attr("href")?.match(/^\/articles\/([0-9a-f-]{36})$/i);
    const relatedTitle = link.find("h3 span").first().text().trim();
    if (!match || !relatedTitle) return [];
    const sourceTitle = link.find("div > span").first().text().split(" · ")[0].trim() || null;
    const excerpt = link.find("p").first().text().trim() || null;
    const scoreText = link.text().match(/연관도\s*(\d+)%/u)?.[1];
    const similarityScore = scoreText ? Number(scoreText) / 100 : null;
    const kind = similarityScore !== null ? "semantic" as const : semanticList ? "unscored" as const : "topic" as const;
    return [{ id: match[1], title: relatedTitle, sourceTitle, excerpt, similarityScore, kind }];
  });
  return { id, title, sourceTitle: $("main > p").first().text().split(" · ")[0].trim() || null, excerpt: $("meta[name=description]").attr("content") ?? null, related, semanticList };
}

export async function getPublicGraphSeed() {
  const response = await fetch("https://www.techgotgan.co.kr/", { cache: "no-store" });
  if (!response.ok) return null;
  const $ = load(await response.text());
  for (const link of $("a[href^='/articles/']").toArray()) {
    const match = $(link).attr("href")?.match(/^\/articles\/([0-9a-f-]{36})$/i);
    if (match) return match[1];
  }
  return null;
}
