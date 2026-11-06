import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { ShareButton } from "@/components/share-button";
import { PageHeader } from "@/components/page-header";
import { getPublicCategoryIndex, getPublicTechnologyIndex } from "@/lib/data/public-hubs";
import { SITE_NAME, SITE_URL } from "@/app/seo";

const TITLE = "기술 블로그 주제별 최신 글";
const DESCRIPTION = "프론트엔드, 백엔드, AI·머신러닝, DevOps 등 기술 주제별로 기업 테크 블로그의 최신 글을 찾아 원문까지 읽어보세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/topics` },
  openGraph: { title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION, url: `${SITE_URL}/topics`, locale: "ko_KR", type: "website" },
};

export const runtime = "nodejs";
export const fetchCache = "default-cache";

export default async function TopicsPage() {
  await connection();
  const [categories, technologies] = await Promise.all([getPublicCategoryIndex(), getPublicTechnologyIndex()]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/topics`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHeader navHref="/" navLabel="전체 글" />
      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <Text as="h1" textStyle="t8Bold" color="fg.neutral">{TITLE}</Text>
          {categories.length > 0 && (
            <ShareButton title={TITLE} url="/topics" size="small" variant="neutralWeak" shareSurface="topic_directory" shareCampaign="topic_directory_share_2026q4" />
          )}
        </div>
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">{DESCRIPTION}</Text>
      </header>
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, listStyle: "none" }}>
        {categories.map(({ category, meta, articleCount }) => {
          return (
            <li key={category}>
              <Link
                href={`/topics/${category}`}
                style={{ display: "flex", minHeight: 132, flexDirection: "column", gap: 8, padding: 18, border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 12 }}
              >
                <Text as="h2" textStyle="t5Bold" color="fg.neutral">{meta.title}</Text>
                <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">{meta.description}</Text>
                <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
                  {articleCount.toLocaleString("ko-KR")}개 글
                </Text>
              </Link>
            </li>
          );
        })}
      </ul>
      {technologies.length > 0 && (
        <section aria-labelledby="technology-index" style={{ display: "grid", gap: 12 }}>
          <Text as="h2" id="technology-index" textStyle="t6Bold" color="fg.neutral">
            기술 용어로 회사 기술 블로그 찾기
          </Text>
          <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
            React, TypeScript, Kubernetes처럼 기술 이름을 기준으로 관련 글과 발행처를 살펴보세요.
          </Text>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {technologies.map(({ term }) => (
              <Link key={term.slug} href={`/technologies/${term.slug}`} style={{ border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 999, padding: "7px 12px" }}>
                {term.label} 기술 블로그
              </Link>
            ))}
            <Link href="/technologies" style={{ alignSelf: "center", textDecoration: "underline", textUnderlineOffset: 3 }}>
              기술별 전체 보기 →
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
