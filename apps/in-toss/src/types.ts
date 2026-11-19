export interface Article {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  click_count: number;
  category: string;
  tags: string[];
  source: {
    id: string;
    title: string | null;
    site_url: string;
    favicon_url: string | null;
  } | null;
}

export interface ArticleDetail {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  publishedAt: string | null;
  category: string;
  tags: string[];
  sourceTitle: string | null;
  summary: { lead: string; keyPoints: string[] } | null;
  summaryBasis: "full_article" | "partial_article" | "excerpt" | null;
  summaryStatus: "pending" | "processing" | "ready" | "unavailable" | "failed" | null;
  summaryGeneratedAt: string | null;
}

export interface Publisher {
  id: string;
  title: string | null;
  site_url: string;
  favicon_url: string | null;
}

export interface DigestWeek {
  week: string;
  label: string;
  dateRangeLabel: string;
  articleCount: number;
  lastModified: string;
}

export interface WeeklyDigest {
  week: string;
  label: string;
  dateRangeLabel: string;
  articleCount: number;
  lastModified: string;
  latestArticles: Article[];
  categoryDistribution: Array<{ label: string; count: number; percentage: number }>;
  sourceDistribution: Array<{ label: string; count: number; percentage: number }>;
}
