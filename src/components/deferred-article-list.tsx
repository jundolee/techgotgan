"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadArticleFeedAction } from "@/app/articles/actions";
import type { ArticleFilter } from "@/lib/data/articles";
import type { CategoryId } from "@/lib/categories";

type DeferredArticleListProps = {
  initialFilter: ArticleFilter;
  initialSourceId: string;
  initialCategory: CategoryId;
  initialView: "list" | "card";
  initialQuery: string;
};

const InteractiveArticleList = dynamic(
  () => import("@/components/article-list").then((module) => module.ArticleList),
  { ssr: false, loading: () => <ArticleListPlaceholder /> }
);

function ArticleListPlaceholder() {
  return (
    <div aria-busy="true" aria-label="글 목록을 불러오는 중">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div className="skeleton" style={{ width: 160, height: 40, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 120, height: 40, borderRadius: 8 }} />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <div className="skeleton" style={{ width: 180, height: 40, borderRadius: 20 }} />
        <div className="skeleton" style={{ width: 120, height: 40, borderRadius: 8 }} />
      </div>
      <ul style={{ display: "flex", flexDirection: "column", listStyle: "none", padding: 0, margin: 0 }}>
        {Array.from({ length: 5 }, (_, index) => (
          <li key={index} style={{ display: "flex", gap: 20, padding: "20px 0", borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="skeleton" style={{ width: 100, height: 20, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: "70%", height: 22 }} />
              <div className="skeleton" style={{ width: "90%", height: 16 }} />
            </div>
            <div className="skeleton" style={{ width: 112, height: 112, flexShrink: 0 }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DeferredArticleList(props: DeferredArticleListProps) {
  const [feed, setFeed] = useState<Awaited<ReturnType<typeof loadArticleFeedAction>> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadStartedRef = useRef(false);

  const loadFeed = useCallback(() => {
    if (loadStartedRef.current || feed) return;
    loadStartedRef.current = true;
    setLoadFailed(false);

    void loadArticleFeedAction()
      .then(setFeed)
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

    document.addEventListener("pointerdown", loadFeed, { once: true, passive: true });
    document.addEventListener("keydown", loadFeed, { once: true });
    document.addEventListener("click", loadFeed, { once: true, capture: true });

    return () => {
      cancelled = true;
      observer?.disconnect();
      document.removeEventListener("pointerdown", loadFeed);
      document.removeEventListener("keydown", loadFeed);
      document.removeEventListener("click", loadFeed, true);
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
        deferFirstThumbnail
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
      <ArticleListPlaceholder />
    </>
  );
}
