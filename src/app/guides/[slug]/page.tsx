import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ShareButton } from "@/components/share-button";
import { SourceArticleLink } from "@/components/source-article-link";
import { GUIDE_PUBLISHED_AT, problemGuides } from "@/lib/content/problem-guides";
import { SITE_NAME, SITE_URL } from "@/app/seo";
import styles from "../guide.module.css";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return problemGuides.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = problemGuides.find((item) => item.slug === slug);
  if (!guide) notFound();
  const url = `${SITE_URL}/guides/${guide.slug}`;
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: url },
    openGraph: { title: guide.title, description: guide.description, url, type: "article", locale: "ko_KR", siteName: SITE_NAME, publishedTime: GUIDE_PUBLISHED_AT, modifiedTime: guide.updatedAt },
    twitter: { card: "summary", title: guide.title, description: guide.description },
  };
}

export default async function ProblemGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = problemGuides.find((item) => item.slug === slug);
  if (!guide) notFound();
  const url = `${SITE_URL}/guides/${guide.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "Article",
      headline: guide.title, description: guide.description, url,
      mainEntityOfPage: url, inLanguage: "ko-KR",
      datePublished: GUIDE_PUBLISHED_AT, dateModified: guide.updatedAt,
      author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      citation: [guide.source.url, guide.documentation.url],
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "문제 해결 가이드", item: `${SITE_URL}/guides` },
        { "@type": "ListItem", position: 3, name: guide.title, item: url },
      ],
    },
  ];

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHeader navHref="/guides" navLabel="문제 해결 가이드" exploreMenu />
      <nav aria-label="breadcrumb" className={styles.breadcrumb}>
        <Link href="/">{SITE_NAME}</Link><span aria-hidden="true">/</span><Link href="/guides">문제 해결 가이드</Link>
      </nav>
      <article className={styles.article}>
        <header className={styles.hero}>
          <p className={styles.kicker}>{guide.topic}</p>
          <h1>{guide.title}</h1>
          <p className={styles.lead}>{guide.answer}</p>
          <p className={styles.meta}>{SITE_NAME} · 원문 사례와 검토 질문 · <time dateTime={GUIDE_PUBLISHED_AT}>2026년 11월 11일</time></p>
          <ShareButton title={guide.title} url={url} size="small" variant="neutralWeak" shareSurface="content_guide" shareCampaign={`problem_guide_${guide.slug.replaceAll("-", "_")}_2026w46`} />
        </header>
        <nav aria-label="이 글의 목차" className={styles.contents}>
          <a href="#source-case">기업 사례</a><a href="#case-lessons">사례에서 발견한 조건</a><a href="#steps">검토 순서</a><a href="#worksheet">작성 양식</a><a href="#review">판단할 때 주의할 점</a>
        </nav>
        <section id="source-case" className={styles.section}>
          <p className={styles.kicker}>{guide.source.publisher}의 공개 사례</p>
          <h2>{guide.source.title}</h2>
          <p>{guide.source.summary}</p>
          <p className={styles.note}>{guide.source.limit}</p>
          <SourceArticleLink href={guide.source.url} surface="editorial_guide" className={styles.textLink}>기업 원문 읽기 →</SourceArticleLink>
        </section>
        <section id="case-lessons" className={styles.section}>
          <h2>원문 사례에서 발견한 실행 조건</h2>
          <p>아래 결과와 과정은 각 기업 원문에서 확인했습니다. 적용 제안은 테크곳간이 따로 정리한 팀 검토 질문입니다.</p>
          <ol className={styles.steps}>
            {guide.caseLessons.map((lesson) => <li key={lesson.title}>
              <h3>{lesson.title}</h3>
              <p>{lesson.evidence}</p>
              <p><strong>팀에서 확인할 점:</strong> {lesson.application}</p>
            </li>)}
          </ol>
        </section>
        <section id="steps" className={styles.section}>
          <h2>우리 팀에서 검토할 순서</h2>
          <p>아래는 사례를 읽고 테크곳간에서 정리한 검토 제안입니다. 원문 팀이 그대로 사용한 절차나 양식은 아닙니다.</p>
          <ol className={styles.steps}>
            {guide.steps.map((step) => <li key={step.title}><h3>{step.title}</h3><p>{step.body}</p></li>)}
          </ol>
        </section>
        <section id="worksheet" className={styles.section}>
          <h2>{guide.worksheet.title}</h2>
          <p>팀의 실제 상황을 채워 넣을 수 있는 빈 CSV 양식을 제공합니다. Excel이나 Google Sheets로 열어 작성하세요.</p>
          <div className={styles.tableScroll} role="region" aria-label={guide.worksheet.title} tabIndex={0}>
            <table>
              <caption className={styles.srOnly}>{guide.worksheet.title}</caption>
              <thead><tr>{guide.worksheet.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
              <tbody>{guide.worksheet.rows.map(([name, ...cells]) => <tr key={name}><th scope="row">{name}</th>{cells.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <a href={guide.worksheet.download} download className={styles.download}>빈 검토 양식 받기 (CSV)</a>
        </section>
        <section id="review" className={styles.section}>
          <h2>판단할 때 주의할 점</h2>
          {guide.review.map((item) => <div key={item.title} className={styles.review}><h3>{item.title}</h3><p>{item.body}</p></div>)}
          <p>{guide.documentation.note}</p>
          <SourceArticleLink href={guide.documentation.url} surface="editorial_guide" className={styles.textLink}>{guide.documentation.title} →</SourceArticleLink>
        </section>
        <section className={styles.section}>
          <h2>관련 기술과 기업 사례 더 읽기</h2>
          <ul className={styles.related}>{guide.related.map((item) => <li key={item.href}><Link href={item.href}>{item.label} →</Link></li>)}</ul>
          <Link href="/guides" className={styles.textLink}>다른 문제 해결 가이드 보기 →</Link>
        </section>
      </article>
    </main>
  );
}
