import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Text } from "@seed-design/react";
import { PageHeader } from "@/components/page-header";
import { AudienceLandingActionLink } from "@/components/audience-landing-action-link";
import { ShareButton } from "@/components/share-button";
import { SITE_URL, getPublicBlogIndex } from "@/lib/data/public-hubs";
import { SITE_NAME } from "@/app/seo";

// 공개 허브는 Supabase 읽기 모듈을 함께 번들링하므로 기본 Node.js 런타임을 사용한다.
export const runtime = "nodejs";
// 공개 소스와 글은 public-hubs 내부의 force-cache 조회를 통해 제공한다.
export const fetchCache = "default-cache";

const CANONICAL_URL = `${SITE_URL}/blogs`;
const TITLE = "기업 기술 블로그 모음 | 회사별 사례 찾기";
const DESCRIPTION = "기업별 기술 블로그의 최신 글을 한곳에서 찾아보세요. 문제 해결·서비스 개선 사례를 제목과 요약으로 살펴보고, 관심 있는 글은 원문으로 이어 읽을 수 있습니다.";

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <Text as="h1" textStyle="t8Bold" color="fg.neutral">{TITLE}</Text>
          {blogs.some((blog) => blog.hasArticles) && (
            <ShareButton title="기업 기술 블로그 모음" url="/blogs" size="small" variant="neutralWeak" shareSurface="blog_directory" shareCampaign="blog_directory_share_2026q4" />
          )}
        </div>
        <Text as="p" textStyle="t4Regular" color="var(--seed-color-fg-neutral-muted)">
          {DESCRIPTION}
        </Text>
      </header>

      <section aria-labelledby="directory-guide" style={{ display: "grid", gap: 8 }}>
        <Text as="h2" id="directory-guide" textStyle="t5Bold" color="fg.neutral">
          회사별 기술 블로그에서 최신 글과 실제 사례 찾기
        </Text>
        <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          회사 이름을 선택하면 해당 기술 블로그에서 최근 수집한 글을 볼 수 있습니다. 글 제목을 열어 요약과 태그를 살펴본 뒤 원문으로 이동하세요. 검색어가 정해져 있다면 전체 글에서 검색하고, 기술 용어별로 찾으려면{" "}
          <Link href="/technologies" style={{ color: "var(--seed-color-fg-brand)", textDecoration: "underline", textUnderlineOffset: 3 }}>
            React·Kubernetes 등 기술별 테크 블로그 최신 글
          </Link>
          을, 주제로 둘러보려면{" "}
          <Link href="/topics" style={{ color: "var(--seed-color-fg-brand)", textDecoration: "underline", textUnderlineOffset: 3 }}>
            주제별 최신 기술 블로그 글
          </Link>
          을 확인할 수 있습니다. 목록과 원문은 로그인 없이 이용할 수 있습니다.
        </Text>
      </section>

      <section aria-labelledby="collection-method" style={{ display: "grid", gap: 8 }}>
        <Text as="h2" id="collection-method" textStyle="t5Bold" color="fg.neutral">
          기술 블로그 수집 방식과 원문 출처
        </Text>
        <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
          공개 RSS·Atom 피드를 우선 이용하고, 피드가 없는 발행처는 공개 페이지의 글 정보를 읽어 목록을 만듭니다. 테크곳간은 글 제목과 요약, 발행처를 보여주고 원문은 작성한 회사의 블로그로 연결합니다. 찾는 회사 기술 블로그가 목록에 없다면{" "}
          <Link href="/suggest" style={{ color: "var(--seed-color-fg-brand)", textDecoration: "underline", textUnderlineOffset: 3 }}>
            블로그 추가를 제안해 주세요
          </Link>.
        </Text>
      </section>

      <p className="blog-suggestion-note">
        찾는 블로그가 없나요?{" "}
        <Link href="/suggest">블로그 추가 제안</Link>
      </p>

      <p className="blog-suggestion-note">
        기업의 기술 글로 지원 준비하기: <Link href="/careers/toss-frontend">토스 프론트엔드 읽기 가이드 →</Link>
      </p>

      <p className="blog-suggestion-note">
        제품 사례나 구현 근거를 찾고 있나요?{" "}
        <AudienceLandingActionLink href="/for-product-teams" action="blog_directory_entry">기획자·개발자별 활용 방법 →</AudienceLandingActionLink>
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
