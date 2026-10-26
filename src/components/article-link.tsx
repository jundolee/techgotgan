"use client";

import { type CSSProperties, type MouseEvent, type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { markArticleReadAction, markArticleReadFallbackAction } from "@/app/articles/actions";

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
  const pathname = usePathname();
  const router = useRouter();
  const [pendingNavigation, setPendingNavigation] = useState<{ sourcePath: string; targetPath: string } | null>(null);

  useEffect(() => {
    if (!pendingNavigation) return;
    const timeoutMs = pathname === pendingNavigation.sourcePath ? 30_000 : 0;
    const timeoutId = window.setTimeout(() => setPendingNavigation(null), timeoutMs);
    return () => window.clearTimeout(timeoutId);
  }, [pathname, pendingNavigation]);

  const trackClick = () => {
    // GTM 맞춤 이벤트 트리거(article_click)로 GA4에서 아티클명 기준 집계가 가능하도록 push
    (window as { dataLayer?: unknown[] }).dataLayer?.push({
      event: "article_click",
      article_id: articleId,
      article_title: articleTitle,
    });
    // Keep the read/click write independent from the navigation transition so its network
    // response cannot delay opening the intercepted preview.
    void markArticleReadAction(articleId)
      .then(async (result) => {
        if (result === "saved") return;
        if (result === "unauthenticated") {
          onReadChange?.(articleId, false);
          return;
        }

        const fallbackResult = await markArticleReadFallbackAction(articleId);
        if (fallbackResult !== "saved") {
          onReadChange?.(articleId, false);
          console.error("글 읽음 상태 저장에 실패해 목록 표시를 되돌렸습니다.");
        }
      })
      .catch(async (error) => {
        console.error("글 읽음 상태 저장 요청이 실패했습니다. fallback 저장을 시도합니다.", error);
        try {
          const fallbackResult = await markArticleReadFallbackAction(articleId);
          if (fallbackResult !== "saved") onReadChange?.(articleId, false);
        } catch (fallbackError) {
          onReadChange?.(articleId, false);
          console.error("글 읽음 상태 fallback 저장도 실패했습니다.", fallbackError);
        }
      });
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented) return;
    trackClick();

    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      onRead?.(articleId);
      return;
    }

    const articlePath = `/articles/${encodeURIComponent(articleId)}`;
    if (href !== articlePath || !articleId) return;

    // Route through the App Router explicitly so the article intercepting route is used on
    // every hydrated, same-window click instead of allowing a browser document navigation.
    event.preventDefault();
    setPendingNavigation({ sourcePath: pathname, targetPath: articlePath });
    router.push(articlePath, { scroll: false });
    // Keep this Link mounted long enough to paint the optimistic modal shell before the unread
    // filter removes its row from the list.
    window.setTimeout(() => onRead?.(articleId), 0);
  };

  return (
    <>
      <Link
        href={href}
        // Dynamic article routes only need their prefetched loading shell. Forcing the full route
        // rendered every visible article preview in the background and competed with real clicks.
        prefetch="auto"
        style={style}
        className={className}
        onClick={handleClick}
        // 휠 버튼(가운데)이나 우클릭으로 여는 경우 "click"이 아니라 "auxclick"이 발생해 onClick만으로는
        // 읽음 처리가 누락됨. 우클릭 메뉴에서 실제로 "새 탭에서 링크 열기"를 선택했는지는 JS로 알 수 없어
        // (메뉴 선택은 브라우저 네이티브 UI라 관측 불가) 우클릭 자체를 "열었다"로 간주하는 근사치 처리다 —
        // 메뉴를 취소하거나 "링크 복사" 등 다른 항목을 골라도 읽음 처리된다.
        onAuxClick={(e: MouseEvent<HTMLAnchorElement>) => {
          if (e.button === 1 || e.button === 2) {
            trackClick();
            onRead?.(articleId);
          }
        }}
      >
        {children}
      </Link>
      {pendingNavigation?.sourcePath === pathname && pathname !== pendingNavigation.targetPath && (
        <>
          <div className="article-preview-backdrop article-preview-backdrop-instant" aria-hidden="true">
            <section className="article-preview-dialog article-preview-dialog-instant">
              <header className="article-preview-header">
                <span className="article-preview-opening-title">게시글을 여는 중</span>
              </header>
              <div className="article-preview-body article-preview-opening-body">
                <div className="article-preview-opening-line article-preview-opening-line-short" />
                <div className="article-preview-opening-line article-preview-opening-line-title" />
                <div className="article-preview-opening-card">
                  <div className="article-preview-opening-line article-preview-opening-line-medium" />
                  <div className="article-preview-opening-line" />
                  <div className="article-preview-opening-line article-preview-opening-line-short" />
                </div>
              </div>
            </section>
          </div>
          <span className="article-preview-opening-status" role="status" aria-live="polite">게시글을 불러오고 있습니다.</span>
        </>
      )}
    </>
  );
}
