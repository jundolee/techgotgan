"use client";

import { type CSSProperties, type MouseEvent, type ReactNode, useTransition } from "react";
import Link from "next/link";
import { markArticleReadAction } from "@/app/articles/actions";

interface ArticleLinkProps {
  articleId: string;
  articleTitle: string;
  href: string;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  // 서버 액션 응답(revalidatePath)을 기다리지 않고 클릭 즉시 목록에 읽음으로 반영하기 위한 낙관적 업데이트 콜백.
  onRead?: (articleId: string) => void;
  onReadChange?: (articleId: string, isRead: boolean) => void;
}

/**
 * 클릭 시 앱 안의 상세 경로로 이동해 인터셉트 모달을 열고 읽음 처리를 트리거한다.
 * 새 탭이나 직접 URL 진입에서는 같은 경로의 독립 상세 페이지를 보여준다.
 */
export function ArticleLink({ articleId, articleTitle, href, children, style, className, onRead, onReadChange }: ArticleLinkProps) {
  const [, startTransition] = useTransition();
  const trackClick = () => {
    // GTM 맞춤 이벤트 트리거(article_click)로 GA4에서 아티클명 기준 집계가 가능하도록 push
    (window as { dataLayer?: unknown[] }).dataLayer?.push({
      event: "article_click",
      article_id: articleId,
      article_title: articleTitle,
    });
    onRead?.(articleId);
    // Server Action은 React transition 안에서 실행한다. 로그인되지 않은 경우만 읽음 표시를 되돌린다.
    // 로그인 사용자의 저장 실패는 모달 라우트의 멱등 fallback이 재시도하므로 UI 상태를 유지한다.
    startTransition(async () => {
      try {
        const result = await markArticleReadAction(articleId);
        if (result === "unauthenticated") onReadChange?.(articleId, false);
        if (result === "failed") console.error("글 읽음 상태 저장이 지연되었습니다. 모달 라우트에서 재시도합니다.");
      } catch (error) {
        console.error("글 읽음 상태 저장이 지연되었습니다. 모달 라우트에서 재시도합니다.", error);
      }
    });
  };

  return (
    <Link
      href={href}
      prefetch={true}
      style={style}
      className={className}
      onClick={trackClick}
      // 휠 버튼(가운데)이나 우클릭으로 여는 경우 "click"이 아니라 "auxclick"이 발생해 onClick만으로는
      // 읽음 처리가 누락됨. 우클릭 메뉴에서 실제로 "새 탭에서 링크 열기"를 선택했는지는 JS로 알 수 없어
      // (메뉴 선택은 브라우저 네이티브 UI라 관측 불가) 우클릭 자체를 "열었다"로 간주하는 근사치 처리다 —
      // 메뉴를 취소하거나 "링크 복사" 등 다른 항목을 골라도 읽음 처리된다.
      onAuxClick={(e: MouseEvent<HTMLAnchorElement>) => {
        if (e.button === 1 || e.button === 2) trackClick();
      }}
    >
      {children}
    </Link>
  );
}
