"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { loadArticleFeedAction } from "@/app/articles/actions";
import type { ArticleFilter } from "@/lib/data/articles";
import type { CategoryId } from "@/lib/categories";
import { ArticleListSkeleton } from "@/components/article-list-skeleton";

type DeferredArticleListProps = {
  initialFilter: ArticleFilter;
  initialSourceId: string;
  initialCategory: CategoryId;
  initialView: "list" | "card";
  initialQuery: string;
  deferFirstThumbnail: boolean;
  children?: ReactNode;
};

const InteractiveArticleList = dynamic(
  () => import("@/components/article-list").then((module) => module.ArticleList),
  { ssr: false, loading: () => <ArticleListSkeleton /> }
);

export function DeferredArticleList({ deferFirstThumbnail, children, ...props }: DeferredArticleListProps) {
  const [feed, setFeed] = useState<Awaited<ReturnType<typeof loadArticleFeedAction>> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadStartedRef = useRef(false);

  const loadFeed = useCallback(() => {
    if (loadStartedRef.current || feed) return;
    loadStartedRef.current = true;
    setLoadFailed(false);

    void Promise.all([
      loadArticleFeedAction(),
      import("@/components/article-list"),
    ])
      .then(([loadedFeed]) => setFeed(loadedFeed))
      .catch(() => {
        loadStartedRef.current = false;
        setLoadFailed(true);
      });
  }, [feed]);

  useEffect(() => {
    if (feed) return;

    let cancelled = false;
    let stableTimer: number | undefined;
    let fallbackTimer: number | undefined;
    let idleTimer: number | undefined;
    let idleCallbackId: number | undefined;
    let observer: PerformanceObserver | undefined;

    const loadWhenIdle = () => {
      if (cancelled || loadStartedRef.current) return;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      const browserWindow = window as Window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      };
      if (browserWindow.requestIdleCallback) {
        idleCallbackId = browserWindow.requestIdleCallback(loadFeed, { timeout: 2_000 });
      } else {
        idleTimer = window.setTimeout(loadFeed, 500);
      }
    };

    const waitForStableLcp = () => {
      if (stableTimer !== undefined) window.clearTimeout(stableTimer);
      stableTimer = window.setTimeout(loadWhenIdle, 1_500);
    };

    if (
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")
    ) {
      if (performance.getEntriesByType("largest-contentful-paint").length > 0) {
        waitForStableLcp();
      } else {
        observer = new PerformanceObserver((entries) => {
          if (entries.getEntries().length > 0) waitForStableLcp();
        });
        observer.observe({ type: "largest-contentful-paint", buffered: true });
      }
      fallbackTimer = window.setTimeout(loadWhenIdle, 15_000);
    } else {
      idleTimer = window.setTimeout(loadFeed, 5_000);
    }

    const loadForInPageInteraction = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("a[href]")) return;
      loadFeed();
    };

    document.addEventListener("pointerdown", loadForInPageInteraction, { passive: true });
    document.addEventListener("keydown", loadForInPageInteraction);
    document.addEventListener("click", loadForInPageInteraction, true);

    return () => {
      cancelled = true;
      observer?.disconnect();
      document.removeEventListener("pointerdown", loadForInPageInteraction);
      document.removeEventListener("keydown", loadForInPageInteraction);
      document.removeEventListener("click", loadForInPageInteraction, true);
      if (stableTimer !== undefined) window.clearTimeout(stableTimer);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      if (idleTimer !== undefined) window.clearTimeout(idleTimer);
      if (idleCallbackId !== undefined) {
        const browserWindow = window as Window & { cancelIdleCallback?: (handle: number) => void };
        browserWindow.cancelIdleCallback?.(idleCallbackId);
      }
    };
  }, [feed, loadFeed]);

  if (feed) {
    return (
      <InteractiveArticleList
        articles={feed.articles}
        sources={feed.sources}
        {...props}
        deferFirstThumbnail={deferFirstThumbnail}
      />
    );
  }

  return (
    <>
      {loadFailed && (
        <p role="status">
          글 목록을 불러오지 못했어요. <button type="button" onClick={loadFeed}>다시 시도</button>
        </p>
      )}
      {children ?? <ArticleListSkeleton />}
    </>
  );
}
