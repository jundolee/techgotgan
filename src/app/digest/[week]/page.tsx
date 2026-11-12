import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { DigestArticleList } from "@/components/weekly-digest/digest-article-list";
import { DigestBreadcrumbs } from "@/components/weekly-digest/digest-breadcrumbs";
import { DigestDistributionList } from "@/components/weekly-digest/digest-distribution-list";
import { DigestHeader } from "@/components/weekly-digest/digest-header";
import { DigestJsonLd } from "@/components/weekly-digest/digest-json-ld";
import { getWeeklyDigest, isValidDigestWeek, type DigestArticle } from "@/lib/data/weekly-digests";
import {
  getPublicTechnologyHub,
  matchesTechnologyTermText,
  MIN_PUBLIC_TECHNOLOGY_INDEX_ARTICLES,
  PUBLIC_TECHNOLOGY_TERMS,
  type PublicTechnologyIndexItem,
} from "@/lib/data/public-hubs";
import { SITE_NAME, SITE_URL } from "@/app/seo";

type PageProps = {
  params: Promise<{ week: string }>;
};

function getPageDescription(label: string, dateRangeLabel: string, articleCount: number): string {
  return `${dateRangeLabel}에 새로 발행된 테크 블로그 글 ${articleCount}개를 ${label} 큐레이션으로 정리했습니다.`;
}

async function getRelatedTechnologies(articles: DigestArticle[]): Promise<PublicTechnologyIndexItem[]> {
  const candidates = PUBLIC_TECHNOLOGY_TERMS
    .map((term) => ({
      term,
      articleCount: articles.filter((article) => matchesTechnologyTermText(article.title, article.excerpt, term.slug)).length,
    }))
    .filter((technology) => technology.articleCount >= 2)
    .sort((a, b) => b.articleCount - a.articleCount || a.term.label.localeCompare(b.term.label, "ko"));

  const related: PublicTechnologyIndexItem[] = [];
  // Validate only repeated terms from this digest; sparse or noindex hubs stay unlinked.
  for (let offset = 0; offset < candidates.length && related.length < 5; offset += 8) {
    const batch = candidates.slice(offset, offset + 8);
    const hubs = await Promise.all(batch.map(({ term }) => getPublicTechnologyHub(term.slug)));
    batch.forEach(({ term }, index) => {
      const hub = hubs[index];
      if (hub && hub.articles.length >= MIN_PUBLIC_TECHNOLOGY_INDEX_ARTICLES) {
        related.push({ term, articleCount: hub.articles.length, lastModified: hub.lastModified });
      }
    });
  }

  return related.slice(0, 5);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connection();
  const { week } = await params;
  if (!isValidDigestWeek(week)) notFound();

  const digest = await getWeeklyDigest(week);
  if (!digest) notFound();

  const title = `${digest.label} 테크 큐레이션`;
  const description = getPageDescription(digest.label, digest.dateRangeLabel, digest.articleCount);
  const shareImage = `${SITE_URL}/digest/${digest.week}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical: `/digest/${digest.week}` },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/digest/${digest.week}`,
      locale: "ko_KR",
      type: "website",
      images: [{
        url: shareImage,
        width: 1200,
        height: 630,
        alt: `${digest.label} 테크 블로그 큐레이션 공유 카드`,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [shareImage],
    },
  };
}

export default async function WeeklyDigestPage({ params }: PageProps) {
  await connection();
  const { week } = await params;
  if (!isValidDigestWeek(week)) notFound();

  const digest = await getWeeklyDigest(week);
  if (!digest) notFound();

  const canonicalUrl = `${SITE_URL}/digest/${digest.week}`;
  const description = getPageDescription(digest.label, digest.dateRangeLabel, digest.articleCount);
  const relatedTechnologies = await getRelatedTechnologies(digest.latestArticles);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <DigestJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "주간 큐레이션", item: `${SITE_URL}/digest` },
            { "@type": "ListItem", position: 3, name: digest.label, item: canonicalUrl },
          ],
        }}
      />
      <DigestJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${digest.label} 테크 큐레이션`,
          description,
          url: canonicalUrl,
          inLanguage: "ko-KR",
          isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
        }}
      />
      <DigestHeader
        shareTitle={`${digest.label} 테크 큐레이션`}
        shareUrl={`/digest/${digest.week}`}
      />
      <DigestBreadcrumbs current={digest.label} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          {digest.dateRangeLabel}
        </Text>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">
          {digest.label} 테크 큐레이션
        </Text>
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
          이번 주에는 {digest.articleCount}개의 새 글이 모였습니다. 분야와 발행처의 분포를 먼저 살펴본 뒤,
          관심 가는 주제는 원문 링크에서 이어 읽어보세요.
        </Text>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 28,
          padding: 20,
          borderRadius: 12,
          background: "var(--seed-color-bg-neutral-weak)",
        }}
      >
        <DigestDistributionList id="category-distribution" title="카테고리 분포" items={digest.categoryDistribution} />
        <DigestDistributionList id="source-distribution" title="소스 분포" items={digest.sourceDistribution} />
      </div>
      {relatedTechnologies.length > 0 && (
        <section aria-labelledby="related-technology-hubs" style={{ display: "grid", gap: 10 }}>
          <Text as="h2" id="related-technology-hubs" textStyle="t6Bold" color="fg.neutral">
            이번 주 함께 다룬 기술
          </Text>
          <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
            같은 기술을 다룬 기업 블로그의 최신 글도 이어서 살펴보세요.
          </Text>
          <ul style={{ display: "flex", gap: 8, flexWrap: "wrap", listStyle: "none" }}>
            {relatedTechnologies.map(({ term }) => (
              <li key={term.slug}>
                <Link
                  href={`/technologies/${term.slug}`}
                  style={{ display: "inline-flex", border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 999, padding: "6px 10px" }}
                >
                  {term.label} 기술 블로그
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <DigestArticleList articles={digest.latestArticles} totalCount={digest.articleCount} />
    </main>
  );
}
