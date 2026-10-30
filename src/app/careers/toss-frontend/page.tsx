import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/app/seo";
import { PageHeader } from "@/components/page-header";
import { ShareButton } from "@/components/share-button";
import { CareerFeedback, CareerLink } from "@/components/career-experiment";

const url = "https://www.techgotgan.co.kr/careers/toss-frontend";
const title = "토스 프론트엔드 지원 전 읽어볼 글";
const socialTitle = `${title} | ${SITE_NAME}`;
const description = "토스 프론트엔드 지원 전 살펴볼 기술 블로그 글과 면접 준비에 도움이 될 질문을 모았습니다.";
const shareImage = `${url}/opengraph-image`;
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: {
    title: socialTitle,
    description,
    url,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
    images: [{ url: shareImage, width: 1200, height: 630, alt: socialTitle }],
  },
  twitter: {
    card: "summary_large_image",
    title: socialTitle,
    description,
    images: [{ url: shareImage, alt: socialTitle }],
  },
};

const items = [
  { id: "chapter", href: "https://toss.tech/article/toss-frontend-chapter", date: "2021. 4. 28.", title: "토스 프론트엔드 챕터를 소개합니다!", reason: "당시 프론트엔드 개발자가 제품 조직과 직군 챕터에서 어떻게 협업했는지 살펴볼 수 있습니다.", question: "나는 제품 개발과 공통 도구 개선 사이에서 어떤 선택을 해봤나요?" },
  { id: "knowledge", href: "https://toss.tech/article/31643", date: "2024. 11. 15.", title: "토스 프론트엔드 개발자들이 더 이상 문서를 찾지 않는 이유", reason: "개발자의 문서 탐색 문제를 관찰하고, 질문형 도구와 문서화 자동화로 풀어간 과정을 소개합니다.", question: "내가 경험한 개발 과정의 불편은 무엇이고, 어떻게 개선했나요?" },
  { id: "interview", href: "https://toss.tech/article/firesidechat_frontend_8", date: "2024. 11. 28.", title: "Next.js 그만 쓰세요! 면접관이 진짜 원하는 것!? | EP.8 모닥불", reason: "토스 프론트엔드 개발자들이 기술 선택의 이유와 이력서·면접 경험을 이야기하는 영상입니다.", question: "사용한 기술의 이름뿐 아니라 그 기술을 선택한 이유와 트레이드오프를 설명할 수 있나요?" },
];

export default function TossFrontendGuide() {
  return <main style={{ display: "flex", flexDirection: "column", gap: 32 }}>
    <PageHeader navHref="/blogs" navLabel="블로그 목록" />
    <header style={{ display: "grid", gap: 12 }}>
      <p style={{ color: "#a14614", fontWeight: 700 }}>기업별 기술 블로그 읽기 · 프론트엔드</p>
      <h1 style={{ fontSize: "clamp(28px, 6vw, 38px)", lineHeight: 1.25 }}>토스 프론트엔드 지원 전 읽어볼 글</h1>
      <p>어떤 문제를 다루고 어떻게 협업했는지, 토스가 공개한 세 편의 글과 영상으로 살펴보세요. 각 자료를 읽은 뒤 자신의 경험과 연결해볼 질문도 함께 담았습니다.</p>
      <p style={{ color: "#666", fontSize: 14 }}>테크곳간이 독립적으로 고른 자료입니다. 공식 채용 안내나 예상 면접 문항이 아니며, 글의 발행 시점과 현재 공고를 함께 확인하세요.</p>
      <div><ShareButton title="토스 프론트엔드 지원 전 읽어볼 글" url={url} size="small" variant="neutralWeak" shareSurface="career_guide" shareCampaign="career_guide_toss_frontend_2026q4" /></div>
    </header>
    <section aria-labelledby="reading"><h2 id="reading" style={{ fontSize: 23, marginBottom: 16 }}>이 순서로 살펴보세요</h2>
      <ol style={{ display: "grid", gap: 16, listStyle: "none" }}>{items.map((item, index) => <li key={item.id} style={{ border: "1px solid #e4e4e4", borderRadius: 14, padding: 20, display: "grid", gap: 10 }}>
        <p style={{ color: "#777", fontSize: 14 }}>{index + 1}. 토스 테크 · {item.date}</p>
        <h3 style={{ fontSize: 19, lineHeight: 1.4 }}><CareerLink href={item.href} id={item.id}>{item.title}</CareerLink></h3>
        <p>{item.reason}</p><p style={{ background: "#fff5ed", borderRadius: 8, padding: 12 }}><strong>생각해볼 질문</strong><br />{item.question}</p>
      </li>)}</ol>
    </section>
    <section style={{ display: "grid", gap: 10 }}><h2 style={{ fontSize: 23 }}>읽은 뒤 확인할 것</h2><p>자료는 발행 당시의 경험입니다. 실제 지원 조건과 현재 조직의 상황은 공식 채용 공고에서 확인하고, 자신의 프로젝트에서 선택한 이유와 결과를 정리해 보세요.</p><CareerLink href="https://toss.im/career" id="careers">토스 공식 채용 페이지</CareerLink><Link href="/blogs/%ED%86%A0%EC%8A%A4-%EA%B8%B0%EC%88%A0-%EB%B8%94%EB%A1%9C%EA%B7%B8-%ED%86%A0%EC%8A%A4-%ED%85%8C%ED%81%AC-toss-tech" style={{ textDecoration: "underline" }}>테크곳간에서 토스 테크 최신 글 더 보기</Link></section>
    <section style={{ background: "#f7f7f7", padding: 20, borderRadius: 14 }}><CareerFeedback /></section>
  </main>;
}
