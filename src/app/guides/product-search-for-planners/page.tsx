import type { Metadata } from "next";
import Link from "next/link";
import { AudienceLandingActionLink } from "@/components/audience-landing-action-link";
import { PageHeader } from "@/components/page-header";
import { ShareButton } from "@/components/share-button";
import { SourceArticleLink } from "@/components/source-article-link";
import { SITE_NAME, SITE_URL } from "@/app/seo";
import styles from "./page.module.css";

const canonical = `${SITE_URL}/guides/product-search-for-planners`;
const title = "검색 기능을 기획할 때, 기술 블로그에서 확인할 다섯 가지";
const description = "기획자가 기업 기술 블로그의 검색·추천 사례를 제품 검토에 활용할 때 확인할 데이터, 매칭, 지표, 운영 질문을 정리했습니다.";
const shareImage = `${SITE_URL}/for-product-teams/opengraph-image`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description,
    url: canonical,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "article",
    images: [{ url: shareImage, width: 1200, height: 630, alt: "기획자와 개발자가 기업 기술 사례를 찾는 테크곳간" }],
  },
  twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description, images: [shareImage] },
};

const questions = [
  {
    title: "사용자는 어떤 말로 찾나요?",
    body: "공식 명칭뿐 아니라 별칭, 오탈자, 언어별 표기까지 실제 검색어에 포함되는지 확인합니다.",
  },
  {
    title: "검색 대상은 충분히 들어 있나요?",
    body: "검색 알고리즘을 바꾸기 전에 색인 범위와 데이터 최신성, 누락된 대상을 살펴봅니다.",
  },
  {
    title: "무엇을 같은 대상으로 볼까요?",
    body: "이름이 완전히 일치하지 않아도 같은 장소나 상품을 찾아야 하는지, 잘못 연결될 때 어떤 문제가 생기는지 묻습니다.",
  },
  {
    title: "좋은 결과를 무엇으로 판단하나요?",
    body: "커버리지, 첫 결과의 적합성, 클릭 뒤 완료율 중 제품 목표와 맞는 지표를 고르고 품질 저하를 막을 기준도 둡니다.",
  },
  {
    title: "출시 뒤 누가 어떻게 살펴보나요?",
    body: "새 검색어와 데이터 변화가 생겼을 때 오류를 발견하고 결과를 보정할 담당자와 운영 방법을 정합니다.",
  },
];

export default function ProductSearchForPlannersPage() {
  return (
    <main className={styles.main}>
      <PageHeader navHref="/for-product-teams" navLabel="사례 검색" />

      <nav className={styles.breadcrumb} aria-label="breadcrumb">
        <ol>
          <li><Link href="/">테크곳간</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/guides">문제 해결 가이드</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">기획자 검색 가이드</li>
        </ol>
      </nav>

      <header className={styles.hero}>
        <p className={styles.kicker}>기획자 가이드 · 검색 기능</p>
        <div className={styles.titleRow}>
          <h1>{title}</h1>
          <ShareButton
            title={title}
            url={canonical}
            size="small"
            variant="neutralWeak"
            shareSurface="content_guide"
            shareCampaign="product_planner_search_guide_share_2026q4"
          />
        </div>
        <p className={styles.lead}>
          검색창을 추가하는 것만으로 검색 경험이 완성되지는 않습니다. 구현 사례를 읽고 요구사항을 입력어, 데이터, 지표, 운영에 관한 질문으로 바꿔보세요.
        </p>
      </header>

      <section className={styles.example} aria-labelledby="case-title">
        <div>
          <p className={styles.kicker}>원문 사례</p>
          <h2 id="case-title">네이버 플레이스의 호텔 검색</h2>
          <p>
            네이버 D2의 사례는 다국어 질의 처리, 장소(POI) 매칭, 검색어와 스니펫 추출을 함께 다룹니다. 글에서는 정확히 일치하는 이름만 찾던 방식이 오탈자와 누락 정보에 취약했다고 설명하고, dense retrieval과 도메인에 맞춘 키워드·스니펫 추출을 소개합니다.
          </p>
          <p className={styles.sourceNote}>
            작성팀은 검색 키워드·스니펫 개선으로 검색 커버리지가 약 3% 늘었다고 보고합니다. 이 수치는 해당 프로젝트의 결과이지, 다른 서비스에 그대로 적용되는 목표치는 아닙니다.
          </p>
        </div>
        <SourceArticleLink href="https://d2.naver.com/helloworld/4896087" surface="editorial_guide" className={styles.sourceLink}>
          네이버 D2 원문 읽기 →
        </SourceArticleLink>
      </section>

      <section className={styles.questions} aria-labelledby="question-title">
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>제품 검토에 쓸 질문</p>
          <h2 id="question-title">검색 사례를 읽으며 확인할 다섯 가지</h2>
        </div>
        <ol>
          {questions.map((question, index) => (
            <li key={question.title}>
              <span className={styles.questionNumber}>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{question.title}</h3>
                <p>{question.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className={styles.caveat}>
          기술 블로그는 기획 결정을 대신 내려주지 않습니다. 사례의 배경과 한계는 원문에서 확인하고, 우리 제품에 적용할 근거는 별도로 검증하세요.
        </p>
      </section>

      <section className={styles.nextSteps} aria-labelledby="next-title">
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>관련 사례 찾기</p>
          <h2 id="next-title">다른 회사의 검색·추천 글 살펴보기</h2>
          <p>검색어로 글을 찾고 원문에서 구현 배경과 조건을 확인할 수 있습니다.</p>
        </div>
        <div className={styles.actions}>
          <Link href="/guides" className={styles.textAction}>테스트·AI 자동화 가이드도 읽기 →</Link>
          <AudienceLandingActionLink href="/?q=%EA%B2%80%EC%83%89" action="planner_search" className={styles.primaryAction}>
            검색 사례 찾기
          </AudienceLandingActionLink>
          <AudienceLandingActionLink href="/?q=%EC%B6%94%EC%B2%9C" action="planner_search" className={styles.secondaryAction}>
            추천 사례 찾기
          </AudienceLandingActionLink>
          <AudienceLandingActionLink href="/for-product-teams" action="planner_landing" className={styles.textAction}>
            기획자·개발자별 검색 보기 →
          </AudienceLandingActionLink>
        </div>
      </section>
    </main>
  );
}
