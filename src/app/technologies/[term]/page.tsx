import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { ArticleLink } from "@/components/article-link";
import { PageHeader } from "@/components/page-header";
import { RelatedProblemGuides } from "@/components/related-problem-guides";
import {
  getPublicTechnologyHub,
  MIN_PUBLIC_TECHNOLOGY_INDEX_ARTICLES,
  PUBLIC_CATEGORY_META,
  SITE_URL,
} from "@/lib/data/public-hubs";
import { SITE_NAME } from "@/app/seo";

type TechnologyPageProps = { params: Promise<{ term: string }> };
// Keep sparse, noindex hubs readable when they still have a couple of precise matches.
const MIN_RENDERABLE_ARTICLES = 2;

function technologyUrl(term: string): string {
  return `${SITE_URL}/technologies/${encodeURIComponent(term)}`;
}

function formatDate(iso: string | null): string | null {
  return iso ? new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso)) : null;
}

export async function generateMetadata({ params }: TechnologyPageProps): Promise<Metadata> {
  await connection();
  const { term } = await params;
  const hub = await getPublicTechnologyHub(term);
  if (!hub) return { robots: { index: false, follow: false } };
  const canonical = technologyUrl(hub.term.slug);
  if (hub.articles.length < MIN_PUBLIC_TECHNOLOGY_INDEX_ARTICLES) {
    return { robots: { index: false, follow: true }, alternates: { canonical } };
  }

  return {
    title: hub.term.title,
    description: hub.term.description,
    alternates: { canonical },
    openGraph: { title: `${hub.term.title} | ${SITE_NAME}`, description: hub.term.description, url: canonical, type: "website", locale: "ko_KR" },
    twitter: { card: "summary", title: `${hub.term.title} | ${SITE_NAME}`, description: hub.term.description },
  };
}

export const runtime = "nodejs";
export const fetchCache = "default-cache";

export default async function TechnologyPage({ params }: TechnologyPageProps) {
  await connection();
  const { term } = await params;
  const hub = await getPublicTechnologyHub(term);
  if (!hub || hub.articles.length < MIN_RENDERABLE_ARTICLES) notFound();

  const canonical = technologyUrl(hub.term.slug);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${hub.term.title} | ${SITE_NAME}`,
      description: hub.term.description,
      url: canonical,
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "기술별 글", item: `${SITE_URL}/technologies` },
        { "@type": "ListItem", position: 3, name: hub.term.label, item: canonical },
      ],
    },
  ];

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHeader navHref="/technologies" navLabel="기술별 글" />
      <nav aria-label="breadcrumb">
        <ol style={{ display: "flex", gap: 8, listStyle: "none", flexWrap: "wrap" }}>
          <li><Link href="/">{SITE_NAME}</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/technologies">기술별 글</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{hub.term.label}</li>
        </ol>
      </nav>
      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">{hub.term.title}</Text>
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">{hub.term.description}</Text>
        <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
          {hub.articles.length}개 관련 글 · {hub.sourceCount}개 회사 기술 블로그
        </Text>
      </header>
      {hub.relatedTags.length > 0 && (
        <section aria-labelledby="technology-related-tags" style={{ display: "grid", gap: 10 }}>
          <Text as="h2" id="technology-related-tags" textStyle="t5Bold" color="fg.neutral">
            함께 다룬 기술과 주제
          </Text>
          <ul style={{ display: "flex", gap: 8, flexWrap: "wrap", listStyle: "none" }}>
            {hub.relatedTags.map(({ label, articleCount }) => (
              <li
                key={label}
                style={{ border: "1px solid var(--seed-color-stroke-neutral-subtle)", borderRadius: 999, padding: "6px 10px" }}
              >
                <Text as="span" textStyle="t2Regular" color="fg.neutral">
                  {label} · {articleCount}개 글
                </Text>
              </li>
            ))}
          </ul>
        </section>
      )}
      <RelatedProblemGuides category={hub.term.category} />
      <section aria-labelledby="technology-articles">
        <Text as="h2" id="technology-articles" textStyle="t6Bold" color="fg.neutral" style={{ marginBottom: 16 }}>
          {hub.term.label} 관련 최신 기술 블로그 글
        </Text>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 16 }}>
          {hub.articles.map((article) => (
            <li key={article.id} style={{ borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)", paddingBottom: 16 }}>
              <ArticleLink articleId={article.id} articleTitle={article.title} href={`/articles/${encodeURIComponent(article.id)}`} sourceUrl={article.url} style={{ display: "block" }}>
                <Text as="h3" textStyle="t5Bold" color="fg.neutral">{article.title}</Text>
                {article.excerpt && <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 6 }}>{article.excerpt}</Text>}
              </ArticleLink>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                {article.source && <Link href={`/blogs/${encodeURIComponent(article.source.slug)}`}>{article.source.title}</Link>}
                {formatDate(article.publishedAt) && <Text as="span" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">{formatDate(article.publishedAt)}</Text>}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="more-technology-guides" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Text as="h2" id="more-technology-guides" textStyle="t6Bold" color="fg.neutral" style={{ width: "100%" }}>더 찾아보기</Text>
        <Link href={`/topics/${hub.term.category}`}>{PUBLIC_CATEGORY_META[hub.term.category].title} →</Link>
        <Link href="/technologies">다른 기술 용어 보기 →</Link>
        <Link href="/blogs">회사별 기술 블로그 보기 →</Link>
      </section>
    </main>
  );
}
