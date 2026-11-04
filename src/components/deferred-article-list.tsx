"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { loadArticleFeedAction } from "@/app/articles/actions";
import type { ArticleFilter } from "@/lib/data/articles";
import type { CategoryId } from "@/lib/categories";
import { ArticleListSkeleton } from "@/components/article-list-skeleton";
import type { ArticlePageSize } from "@/lib/article-feed-constants";

type DeferredArticleListProps = {
  initialFilter: ArticleFilter;
  initialSourceId: string;
  initialCategory: CategoryId;
  initialView: "list" | "card";
  initialPageSize: ArticlePageSize;
  initialQuery: string;
  deferFirstThumbnail: boolean;
  children?: ReactNode;
};

type ArticleListComponent = (typeof import("@/components/article-list"))["ArticleList"];
type LoadedFeed = {
  feed: Awaited<ReturnType<typeof loadArticleFeedAction>>;
  ArticleList: ArticleListComponent;
};

type PendingArticleOpen = { title: string };

declare global {
  interface Window {
    __techgotganPendingArticlePath?: string;
    __techgotganPendingArticleSourceUrl?: string;
  }
}

function getPendingArticleLink(pathname: string): HTMLAnchorElement | null {
  return [...document.querySelectorAll<HTMLAnchorElement>('a[data-article-link="true"]')]
    .find((anchor) => {
      try {
        return new URL(anchor.href, window.location.href).pathname === pathname;
      } catch {
        return false;
      }
    }) ?? null;
}

function getPendingArticleTitle(anchor: HTMLAnchorElement): string {
  return anchor.querySelector("h3")?.textContent?.trim() || anchor.textContent?.trim() || "기사";
}

export function DeferredArticleList({ deferFirstThumbnail, children, ...props }: DeferredArticleListProps) {
  const [loaded, setLoaded] = useState<LoadedFeed | null>(null);
  const feed = loaded?.feed ?? null;
  const [loadFailed, setLoadFailed] = useState(false);
  const [hasOpenControlMenu, setHasOpenControlMenu] = useState(false);
  const [pendingArticleOpen, setPendingArticleOpen] = useState<PendingArticleOpen | null>(null);
  const loadStartedRef = useRef(false);

  const loadFeed = useCallback(() => {
    if (loadStartedRef.current || feed) return;
    loadStartedRef.current = true;
    setLoadFailed(false);

    void Promise.all([
      loadArticleFeedAction(),
      import("@/components/article-list"),
    ])
      .then(([loadedFeed, articleListModule]) => {
        setLoaded({ feed: loadedFeed, ArticleList: articleListModule.ArticleList });
      })
      .catch(() => {
        loadStartedRef.current = false;
        window.__techgotganPendingArticlePath = undefined;
        window.__techgotganPendingArticleSourceUrl = undefined;
        setPendingArticleOpen(null);
        setLoadFailed(true);
      });
  }, [feed]);

  useEffect(() => {
    const menus = [...document.querySelectorAll<HTMLDetailsElement>("details[data-deferred-feed-control]")];
    if (menus.length === 0) return;

    const updateOpenMenuState = () => setHasOpenControlMenu(menus.some((menu) => menu.open));
    menus.forEach((menu) => menu.addEventListener("toggle", updateOpenMenuState));
    updateOpenMenuState();
    return () => menus.forEach((menu) => menu.removeEventListener("toggle", updateOpenMenuState));
  }, []);

  useEffect(() => {
    if (feed) return;

    let pendingIndicatorTimer: number | undefined;
    // The document-level bridge can capture an article click before this component hydrates.
    // Start the deferred feed immediately instead of waiting for the idle callback below.
    const capturedPath = window.__techgotganPendingArticlePath;
    const capturedLink = capturedPath ? getPendingArticleLink(capturedPath) : null;
    if (capturedPath && capturedLink) {
      const title = getPendingArticleTitle(capturedLink);
      pendingIndicatorTimer = window.setTimeout(() => setPendingArticleOpen({ title }), 0);
      loadFeed();
    }

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
      if (event.type === "click" && target instanceof Element) {
        const articleLink = target.closest<HTMLAnchorElement>('a[data-article-link="true"]');
        if (articleLink) {
          setPendingArticleOpen({ title: getPendingArticleTitle(articleLink) });
          loadFeed();
          return;
        }
      }

      if (target instanceof Element && target.closest("a[href], details[data-deferred-feed-control], form[data-deferred-feed-navigation]")) return;
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
      if (pendingIndicatorTimer !== undefined) window.clearTimeout(pendingIndicatorTimer);
      if (idleCallbackId !== undefined) {
        const browserWindow = window as Window & { cancelIdleCallback?: (handle: number) => void };
        browserWindow.cancelIdleCallback?.(idleCallbackId);
      }
    };
  }, [feed, loadFeed]);

  if (loaded && !hasOpenControlMenu) {
    const InteractiveArticleList = loaded.ArticleList;
    return (
      <InteractiveArticleList
        articles={loaded.feed.articles}
        sources={loaded.feed.sources}
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
      {pendingArticleOpen && !feed && (
        <div className="article-open-pending" role="status" aria-live="polite">
          <span className="article-open-pending-spinner" aria-hidden="true" />
          <span className="article-open-pending-copy">
            <strong>{pendingArticleOpen.title}</strong>
            <span>기사를 여는 중이에요</span>
          </span>
        </div>
      )}
      {children ?? <ArticleListSkeleton />}
    </>
  );
}
