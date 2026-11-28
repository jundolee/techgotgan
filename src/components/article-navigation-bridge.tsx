"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  markArticleReadAction,
  markArticleReadFallbackAction,
} from "@/app/articles/actions";

declare global {
  interface Window {
    __techgotganPendingArticlePath?: string;
    __techgotganPendingArticleSourceUrl?: string;
    __techgotganPendingArticleTitle?: string;
    dataLayer?: unknown[];
  }
}

const PENDING_ARTICLE_EVENT = "techgotgan:article-navigation-pending";

export function ArticleNavigationBridge() {
  const router = useRouter();

  useEffect(() => {
    function navigateToPendingArticle() {
      const articlePath = window.__techgotganPendingArticlePath;
      if (!articlePath || !/^\/articles\/[0-9a-f-]+$/i.test(articlePath)) return;

      const articleId = articlePath.slice("/articles/".length);
      const sourceUrl = window.__techgotganPendingArticleSourceUrl;
      const articleTitle = window.__techgotganPendingArticleTitle || "기사";
      window.__techgotganPendingArticlePath = undefined;
      window.__techgotganPendingArticleSourceUrl = undefined;
      window.__techgotganPendingArticleTitle = undefined;

      if (sourceUrl) {
        try {
          window.sessionStorage.setItem(`techgotgan-article-source:${articleId}`, sourceUrl);
        } catch {}
      }

      window.dataLayer?.push({
        event: "article_click",
        article_id: articleId,
        article_title: articleTitle,
      });

      void markArticleReadAction(articleId)
        .then(async (result) => {
          if (result === "saved" || result === "unauthenticated") return;
          const fallbackResult = await markArticleReadFallbackAction(articleId);
          if (fallbackResult !== "saved") {
            console.error("글 읽음 상태 저장에 실패했습니다.");
          }
        })
        .catch(async (error) => {
          console.error("글 읽음 상태 저장 요청이 실패했습니다. fallback 저장을 시도합니다.", error);
          try {
            const fallbackResult = await markArticleReadFallbackAction(articleId);
            if (fallbackResult !== "saved") {
              console.error("글 읽음 상태 fallback 저장도 실패했습니다.");
            }
          } catch (fallbackError) {
            console.error("글 읽음 상태 fallback 저장도 실패했습니다.", fallbackError);
          }
        });

      router.push(articlePath, { scroll: false });
    }

    navigateToPendingArticle();
    window.addEventListener(PENDING_ARTICLE_EVENT, navigateToPendingArticle);
    return () => window.removeEventListener(PENDING_ARTICLE_EVENT, navigateToPendingArticle);
  }, [router]);

  return null;
}
