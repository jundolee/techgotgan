import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { PageHeader } from "@/components/page-header";
import { SITE_URL, getPublicBlogIndex } from "@/lib/data/public-hubs";
import { SITE_NAME } from "@/app/seo";

// 공개 허브는 Supabase 읽기 모듈을 함께 번들링하므로 기본 Node.js 런타임을 사용한다.
export const runtime = "nodejs";
// 공개 소스와 글은 public-hubs 내부의 force-cache 조회를 통해 제공한다.
export const fetchCache = "default-cache";

const CANONICAL_URL = `${SITE_URL}/blogs`;
const TITLE = "기업 기술 블로그 모음 | 최신 IT·개발 글";
const DESCRIPTION = "토스·당근 등 기업과 개발자가 운영하는 국내외 기술 블로그를 발행처별로 모았습니다. 최신 글의 제목과 요약을 살펴보고, 관심 있는 글은 원문으로 이어 읽어보세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  openGraph: { title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION, url: CANONICAL_URL, type: "website", locale: "ko_KR" },
  twitter: { card: "summary", title: `${TITLE} | ${SITE_NAME}`, description: DESCRIPTION },
};

export default async function BlogsPage() {
  // 빌드 환경에 데이터베이스 자격 증명이 없어도, 배포 요청 시점의 캐시된 공개 데이터를 렌더링한다.
  await connection();
  const blogs = await getPublicBlogIndex();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: CANONICAL_URL,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: blogs.filter((blog) => blog.hasArticles).map((blog, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: blog.displayName,
        url: `${CANONICAL_URL}/${encodeURIComponent(blog.slug)}`,
      })),
    },
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PageHeader navHref="/" navLabel="전체 글" />

      <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Text as="h1" textStyle="t8Bold" color="fg.neutral">{TITLE}</Text>
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
          {DESCRIPTION}
        </Text>
      </header>

      <p className="blog-suggestion-note">
        찾는 블로그가 없나요?{" "}
        <Link href="/suggest">블로그 추가 제안</Link>
      </p>

      <p className="blog-suggestion-note">
        기업의 기술 글로 지원 준비하기: <Link href="/careers/toss-frontend">토스 프론트엔드 읽기 가이드 →</Link>
      </p>

      <section aria-labelledby="blog-list">
        <Text as="h2" id="blog-list" textStyle="t6Bold" color="fg.neutral" style={{ marginBottom: 16 }}>
          활성 블로그 ({blogs.length})
        </Text>
        {blogs.length === 0 ? (
          <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
            현재 공개된 블로그가 없습니다.
          </Text>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none" }}>
            {blogs.map((blog) => (
              <li key={blog.slug}>
                {blog.hasArticles ? (
                  <Link
                    href={`/blogs/${encodeURIComponent(blog.slug)}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      padding: 16,
                      border: "1px solid var(--seed-color-stroke-neutral-subtle)",
                      borderRadius: 12,
                    }}
                  >
                    <Text as="h3" textStyle="t5Bold" color="fg.neutral">{blog.displayName}</Text>
                    <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">{blog.host}</Text>
                    <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
                      최근 글: {blog.latestArticleTitle}
                    </Text>
                  </Link>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      padding: 16,
                      border: "1px solid var(--seed-color-stroke-neutral-subtle)",
                      borderRadius: 12,
                      opacity: 0.7,
                    }}
                  >
                    <Text as="h3" textStyle="t5Bold" color="fg.neutral">{blog.displayName}</Text>
                    <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">{blog.host}</Text>
                    <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
                      아직 수집된 글이 없습니다.
                    </Text>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
