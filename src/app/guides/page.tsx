import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { guideIndex } from "@/lib/content/problem-guides";
import { SITE_NAME, SITE_URL } from "@/app/seo";
import styles from "./guide.module.css";

const title = "문제 해결 가이드 | 테스트·AI 자동화·검색 기획";
const description = "기업 기술 블로그의 사례를 우리 팀의 검토 질문으로 바꿔보세요. E2E 테스트 누락, AI 반복 업무 자동화, 검색 기능 기획의 확인 순서와 작성 양식을 모았습니다.";
export const metadata: Metadata = {
  title, description, alternates: { canonical: `${SITE_URL}/guides` },
  openGraph: { title, description, url: `${SITE_URL}/guides`, type: "website", locale: "ko_KR", siteName: SITE_NAME },
};

export default function GuidesPage() {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "CollectionPage", name: title, description, url: `${SITE_URL}/guides`,
    mainEntity: { "@type": "ItemList", itemListElement: guideIndex.map((guide, index) => ({ "@type": "ListItem", position: index + 1, name: guide.title, url: `${SITE_URL}/guides/${guide.slug}` })) },
  };
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHeader navHref="/" navLabel="전체 글" exploreMenu />
      <header className={styles.hero}>
        <p className={styles.kicker}>기업 사례에서 우리 팀의 다음 질문으로</p>
        <h1>문제 해결 가이드</h1>
        <p className={styles.lead}>{description}</p>
      </header>
      <ol className={styles.guideList}>
        {guideIndex.map((guide) => <li key={guide.slug}><Link href={`/guides/${guide.slug}`}><p className={styles.kicker}>{guide.topic}</p><h2>{guide.title}</h2><p>{guide.description}</p><span className={styles.textLink}>검토 순서 읽기 →</span></Link></li>)}
      </ol>
      <p className={styles.note}>각 가이드는 출처의 결과와 테크곳간의 검토 제안을 구분합니다. 구현 조건과 자세한 과정은 기업 원문에서 확인할 수 있습니다.</p>
      <Link href="/cases" className={styles.textLink}>기업의 문제·해결·결과 먼저 둘러보기 →</Link>
    </main>
  );
}
