import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getCachedArticleFeed } from "@/lib/data/articles";
import { getPublicBlogIndex, getPublicCategoryIndex, getPublicTechnologyIndex } from "@/lib/data/public-hubs";
import { listRecentDigestWeeks } from "@/lib/data/weekly-digests";
import { SITE_URL } from "./seo";

// Latest Production page revisions for static content changes not represented by article data.
const CAREER_GUIDE_LAST_MODIFIED = "2026-10-30T01:43:53.000Z";
const PRODUCT_TEAMS_LAST_MODIFIED = "2026-11-05T14:40:49.000Z";
const PRODUCT_SEARCH_GUIDE_LAST_MODIFIED = "2026-11-05T14:40:49.000Z";
const HOME_LAST_MODIFIED = "2026-11-06T03:24:18.000Z";
const TOPICS_INDEX_LAST_MODIFIED = "2026-11-06T03:24:18.000Z";
const TECHNOLOGY_INDEX_LAST_MODIFIED = "2026-11-06T03:58:45.000Z";
const TECHNOLOGY_TERMS_LAST_MODIFIED = "2026-11-06T03:58:45.000Z";
const STATIC_TOPIC_LAST_MODIFIED: Record<string, string> = {
  ai_ml: "2026-11-06T02:56:15.000Z",
  backend: "2026-11-06T02:56:15.000Z",
  frontend: "2026-11-06T02:56:15.000Z",
  devops: "2026-11-06T02:56:15.000Z",
  mobile: "2026-11-06T02:56:15.000Z",
  data: "2026-11-06T02:56:15.000Z",
  culture: "2026-11-06T02:56:15.000Z",
  general: "2026-11-06T02:56:15.000Z",
};
const STATIC_BLOG_LAST_MODIFIED: Record<string, string> = {
  "토스-기술-블로그-토스-테크-toss-tech": "2026-10-30T02:03:59.000Z",
};
const BLOG_INDEX_LAST_MODIFIED = "2026-11-06T03:00:21.000Z";

function latestContentDate<T extends { discovered_at?: string | null; published_at?: string | null }>(
  items: T[]
): string | undefined {
  return items
    .map((item) => item.discovered_at ?? item.published_at ?? null)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

function latestDate(values: Array<string | null>): string | undefined {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

// /suggest와 관리자 화면은 noindex이므로 제외한다. 실제 내용이 없는 블로그 허브도 sitemap에서 제외한다.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 공개 데이터와 실제 수집 시각을 사용해 페이지별 lastmod를 계산한다.
  await connection();
  const [digestWeeks, feed, blogs, topics, technologies] = await Promise.all([
    listRecentDigestWeeks(),
    getCachedArticleFeed(),
    getPublicBlogIndex(),
    getPublicCategoryIndex(),
    getPublicTechnologyIndex(),
  ]);
  const blogIndexLastModified = latestDate(blogs.map((blog) => blog.lastModified));
  const topicsIndexLastModified = latestDate(topics.map((topic) => topic.lastModified));
  const technologyIndexLastModified = latestDate(technologies.map((technology) => technology.lastModified));

  return [
    {
      url: `${SITE_URL}/guides/product-search-for-planners`,
      lastModified: PRODUCT_SEARCH_GUIDE_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/for-product-teams`,
      lastModified: PRODUCT_TEAMS_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/careers/toss-frontend`,
      lastModified: CAREER_GUIDE_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: SITE_URL,
      lastModified: latestDate([latestContentDate(feed) ?? null, HOME_LAST_MODIFIED]) ?? HOME_LAST_MODIFIED,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/topics`,
      lastModified: latestDate([topicsIndexLastModified ?? null, TOPICS_INDEX_LAST_MODIFIED]),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...topics.map((topic) => ({
      url: `${SITE_URL}/topics/${topic.category}`,
      lastModified: latestDate([topic.lastModified, STATIC_TOPIC_LAST_MODIFIED[topic.category] ?? null]),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...(technologies.length > 0
      ? [
          {
            url: `${SITE_URL}/technologies`,
            lastModified: latestDate([technologyIndexLastModified ?? null, TECHNOLOGY_INDEX_LAST_MODIFIED]) ?? TECHNOLOGY_INDEX_LAST_MODIFIED,
            changeFrequency: "weekly" as const,
            priority: 0.7,
          },
          ...technologies.map((technology) => ({
            url: `${SITE_URL}/technologies/${technology.term.slug}`,
            lastModified: latestDate([technology.lastModified, TECHNOLOGY_TERMS_LAST_MODIFIED]),
            changeFrequency: "daily" as const,
            priority: 0.7,
          })),
        ]
      : []),
    {
      url: `${SITE_URL}/blogs`,
      lastModified: latestDate([blogIndexLastModified ?? null, BLOG_INDEX_LAST_MODIFIED]) ?? BLOG_INDEX_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...blogs.filter((blog) => blog.hasArticles).map((blog) => ({
      url: `${SITE_URL}/blogs/${encodeURIComponent(blog.slug)}`,
      lastModified: latestDate([blog.lastModified, STATIC_BLOG_LAST_MODIFIED[blog.slug] ?? null]),
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    {
      url: `${SITE_URL}/digest`,
      lastModified: latestDate(digestWeeks.map((digest) => digest.lastModified)),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...digestWeeks.map((digest) => ({
      url: `${SITE_URL}/digest/${digest.week}`,
      lastModified: digest.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
