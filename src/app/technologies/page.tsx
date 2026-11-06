import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { PageHeader } from "@/components/page-header";
import { getPublicTechnologyIndex } from "@/lib/data/public-hubs";
import { SITE_NAME, SITE_URL } from "@/app/seo";

const TITLE = "기술 용어별 최신 기술 블로그 글";
const DESCRIPTION = "React, TypeScript, Kubernetes 등 기술 용어별로 기업 기술 블로그의 글을 찾아 원문까지 이어 읽어보세요.";
const CANONICAL = `${SITE_URL}/technologies`;

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const technologies = await getPublicTechnologyIndex();
  return {
    title: TITLE,
    description: DESCRIPTION,
    robots: technologies.length > 0 ? undefined : { index: false, follow: true },
    alternates: { canonical: CANONICAL },
    openGraph: { title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION, url: CANONICAL, type: "website", locale: "ko_KR" },
  };
}

export const runtime = "nodejs";
export const fetchCache = "default-cache";

export default async function TechnologiesPage() {
  await connection();
  const technologies = await getPublicTechnologyIndex();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: technologies.map(({ term }, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: term.label,
        url: `${CANONICAL}/${term.slug}`,
      })),
    },
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHeader navHref="/" navLabel="전체 글" />
      <nav aria-label="breadcrumb">
        <ol style={{ display: "flex", gap: 8, listStyle: "none", flexWrap: "wrap" }}>
          <li><Link href="/">{SITE_NAME}</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">기술별 글</li>
        </ol>
      </nav>
      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">{TITLE}</Text>
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">{DESCRIPTION}</Text>
      </header>
      {technologies.length === 0 ? (
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
          기술별 글을 준비하고 있습니다. <Link href="/topics">주제별 최신 기술 블로그 글</Link>을 먼저 살펴보세요.
        </Text>
      ) : (
        <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, listStyle: "none" }}>
          {technologies.map(({ term, articleCount }) => (
            <li key={term.slug}>
              <Link href={`${CANONICAL}/${term.slug}`} style={{ display: "flex", minHeight: 132, flexDirection: "column", gap: 8, padding: 18, border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 12 }}>
                <Text as="h2" textStyle="t5Bold" color="fg.neutral">{term.label} 기술 블로그</Text>
                <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">{term.description}</Text>
                <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">최근 글 {articleCount}개</Text>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link href="/blogs">회사별 기술 블로그 목록 보기 →</Link>
      </p>
    </main>
  );
}
