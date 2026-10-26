import type { Metadata } from "next";
import Link from "next/link";
import { Text } from "@seed-design/react";
import { PageHeader } from "@/components/page-header";
import { SITE_NAME } from "@/app/seo";
import { RemovalRequestForm } from "./removal-request-form";

export const metadata: Metadata = {
  title: "게시글 삭제 요청",
  description: `${SITE_NAME}에 수집된 게시글의 삭제 또는 수정을 요청할 수 있습니다.`,
  robots: { index: false, follow: true },
};

export default function ContentRemovalPage() {
  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader navHref="/" navLabel="글 목록" />
      <Text as="h1" textStyle="t8Bold" color="fg.neutral">
        게시글 삭제 요청
      </Text>
      <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)" style={{ lineHeight: 1.7, maxWidth: 640 }}>
        원문 게시글 주소와 요청 사유를 보내 주세요. 운영자가 내용을 확인한 뒤 수집 게시글의 삭제 또는 수정 여부를 검토합니다.
        저작권이나 개인정보 침해를 요청하는 경우, 확인에 필요한 구체적인 내용을 함께 적어 주세요.
      </Text>
      <RemovalRequestForm />
      <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)">
        문의 내용은 <Link href="/privacy" style={{ textDecoration: "underline" }}>개인정보처리방침</Link>에 따라 처리합니다.
      </Text>
    </main>
  );
}
