"use client";

import { useEffect } from "react";
import { markArticleReadFallbackAction } from "@/app/articles/actions";

/** Keep public article rendering cacheable and persist the optional user state after hydration. */
export function ArticleReadTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    const hasSupabaseAuthCookie = document.cookie
      .split(";")
      .some((cookie) => cookie.trim().startsWith("sb-") && cookie.includes("-auth-token"));
    if (!hasSupabaseAuthCookie) return;

    void markArticleReadFallbackAction(articleId).catch((error) => {
      console.error("Failed to persist article read state after opening the page:", error);
    });
  }, [articleId]);

  return null;
}
