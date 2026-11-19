import { useEffect, useMemo, useState } from "react";
import { Device, NavigationBar } from "@apps-in-toss/web-framework";
import { fetchArticle, fetchDigest, fetchDigestWeeks, fetchFeed, fetchPublishers, searchFeed } from "./api";
import { loadReadIds, loadSavedArticles, saveReadIds, saveSavedArticles } from "./storage";
import type { Article, ArticleDetail, DigestWeek, Publisher, WeeklyDigest } from "./types";

const CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "frontend", label: "프론트엔드" },
  { id: "backend", label: "백엔드" },
  { id: "ai_ml", label: "AI·머신러닝" },
  { id: "devops", label: "DevOps" },
  { id: "mobile", label: "모바일" },
  { id: "data", label: "데이터" },
  { id: "culture", label: "개발 문화" },
  { id: "general", label: "기타" },
] as const;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(CATEGORIES.map(({ id, label }) => [id, label]));
const API_SEARCH_MIN_LENGTH = 2;
const PAGE_SIZE = 20;
const EMPTY_ARTICLES: Article[] = [];
type BrowseRoute =
  | { kind: "home" }
  | { kind: "publishers" }
  | { kind: "publisher"; publisher: Publisher }
  | { kind: "digest-weeks" }
  | { kind: "digest"; week: DigestWeek };
type FeedState = { scope: string; attempt: number; articles: Article[] | null; error: string | null };
type SearchState = { query: string; results: Article[] | null; loading: boolean; error: string | null };
type DetailState = { articleId: string; article: ArticleDetail | null; loading: boolean; error: string | null };

function isTossRuntime(): boolean {
  return /\.(?:private-)?apps\.tossmini\.com$/i.test(window.location.hostname);
}

function formatDate(value: string | null): string {
  if (!value) return "날짜 미정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 미정";
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(date);
}

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function messageForError(error: unknown, fallback: string): string {
  if (error instanceof TypeError || error instanceof Error && error.message === "Failed to fetch") {
    return "연결이 원활하지 않아요. 잠시 뒤 다시 시도해 주세요.";
  }
  return error instanceof Error ? error.message : fallback;
}

function detailUrl(articleId: string | null): string {
  const url = new URL(window.location.href);
  if (articleId) url.searchParams.set("article", articleId);
  else url.searchParams.delete("article");
  return `${url.pathname}${url.search}${url.hash}`;
}

function routeFromHistory(value: unknown): BrowseRoute {
  if (typeof value !== "object" || value === null || !("kind" in value)) return { kind: "home" };
  const route = value as Partial<BrowseRoute>;
  if (route.kind === "publishers" || route.kind === "digest-weeks" || route.kind === "home") return route as BrowseRoute;
  if (route.kind === "publisher" && "publisher" in route && route.publisher) return route as BrowseRoute;
  if (route.kind === "digest" && "week" in route && route.week) return route as BrowseRoute;
  return { kind: "home" };
}

function ArticleCard({
  article,
  isSaved,
  isRead,
  onOpen,
  onToggleSaved,
}: {
  article: Article;
  isSaved: boolean;
  isRead: boolean;
  onOpen: (id: string) => void;
  onToggleSaved: (article: Article) => void;
}) {
  return (
    <article className={`article-card${isRead ? " is-read" : ""}`}>
      <button className="article-card-main" type="button" onClick={() => onOpen(article.id)}>
        <span className="article-meta">
          <span className="publisher-name">{article.source?.title ?? "기술 블로그"}</span>
          <span className="meta-dot" aria-hidden="true">·</span>
          <span>{formatDate(article.published_at)}</span>
        </span>
        <span className="article-title">{article.title}</span>
        {article.excerpt && <span className="article-excerpt">{article.excerpt}</span>}
        <span className="article-card-bottom">
          <span className="category-pill">{CATEGORY_LABELS[article.category] ?? "기술 글"}</span>
          {isRead && <span className="read-label">읽었어요</span>}
        </span>
      </button>
      <button
        className={`save-button${isSaved ? " is-saved" : ""}`}
        type="button"
        aria-label={isSaved ? `${article.title} 저장 해제` : `${article.title} 저장`}
        aria-pressed={isSaved}
        onClick={() => onToggleSaved(article)}
      >
        <BookmarkIcon filled={isSaved} />
      </button>
    </article>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill={filled ? "currentColor" : "none"}>
      <path d="M6.75 4.75h10.5v15l-5.25-3.35-5.25 3.35v-15Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function renderInlineSummary(value: string) {
  return value.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export function App() {
  const [savedArticles, setSavedArticles] = useState<Map<string, Article>>(() => loadSavedArticles());
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());
  const [activeTab, setActiveTab] = useState<"latest" | "saved">("latest");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>({ query: "", results: null, loading: false, error: null });
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [browseRoute, setBrowseRoute] = useState<BrowseRoute>(() => routeFromHistory(window.history.state?.techgotganRoute));
  const [publisherState, setPublisherState] = useState<{ attempt: number; items: Publisher[] | null; error: string | null }>({ attempt: -1, items: null, error: null });
  const [publisherAttempt, setPublisherAttempt] = useState(0);
  const [digestWeeksState, setDigestWeeksState] = useState<{ attempt: number; items: DigestWeek[] | null; error: string | null }>({ attempt: -1, items: null, error: null });
  const [digestWeeksAttempt, setDigestWeeksAttempt] = useState(0);
  const [digestState, setDigestState] = useState<{ key: string; attempt: number; digest: WeeklyDigest | null; error: string | null }>({ key: "", attempt: -1, digest: null, error: null });
  const [digestAttempt, setDigestAttempt] = useState(0);
  const [feedState, setFeedState] = useState<FeedState>({ scope: "", attempt: -1, articles: null, error: null });
  const [feedAttempt, setFeedAttempt] = useState(0);
  const [pageState, setPageState] = useState({ key: "", count: PAGE_SIZE });
  const [selectedId, setSelectedId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("article"));
  const [detailState, setDetailState] = useState<DetailState>({ articleId: "", article: null, loading: false, error: null });
  const isFeedScreen = browseRoute.kind === "home" || browseRoute.kind === "publisher";
  const feedSourceId = browseRoute.kind === "publisher" ? browseRoute.publisher.id : undefined;
  const feedScope = feedSourceId ? `source:${feedSourceId}` : "all";
  const currentFeed = feedState.scope === feedScope && feedState.attempt === feedAttempt ? feedState : null;
  const articles = currentFeed?.articles ?? EMPTY_ARTICLES;
  const feedLoading = isFeedScreen && !currentFeed;
  const feedError = currentFeed?.error ?? null;
  const currentPublishers = publisherState.attempt === publisherAttempt ? publisherState.items : null;
  const publisherError = publisherState.attempt === publisherAttempt ? publisherState.error : null;
  const currentDigestWeeks = digestWeeksState.attempt === digestWeeksAttempt ? digestWeeksState.items : null;
  const digestWeeksError = digestWeeksState.attempt === digestWeeksAttempt ? digestWeeksState.error : null;
  const digestKey = browseRoute.kind === "digest" ? browseRoute.week.week : "";
  const currentDigest = digestState.key === digestKey && digestState.attempt === digestAttempt ? digestState.digest : null;
  const digestError = digestState.key === digestKey && digestState.attempt === digestAttempt ? digestState.error : null;
  const searchQuery = query.trim();
  const isSearching = searchQuery.length >= API_SEARCH_MIN_LENGTH;
  const currentSearch = browseRoute.kind === "home" && activeTab === "latest" && isSearching && searchState.query === searchQuery ? searchState : null;
  const currentDetail = selectedId && detailState.articleId === selectedId ? detailState : null;
  const detail = currentDetail?.article ?? null;
  const detailLoading = Boolean(selectedId) && (!currentDetail || currentDetail.loading);
  const detailError = currentDetail?.error ?? null;
  const listKey = `${feedScope}:${browseRoute.kind}:${activeTab}:${category}:${query}`;
  const visibleCount = pageState.key === listKey ? pageState.count : PAGE_SIZE;

  useEffect(() => {
    if (!isFeedScreen) return;
    const controller = new AbortController();
    void fetchFeed(controller.signal, feedSourceId)
      .then((items) => {
        if (!controller.signal.aborted) setFeedState({ scope: feedScope, attempt: feedAttempt, articles: items, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setFeedState({ scope: feedScope, attempt: feedAttempt, articles: null, error: messageForError(error, "최신 글을 불러오지 못했어요.") });
      });
    return () => controller.abort();
  }, [feedAttempt, feedScope, feedSourceId, isFeedScreen]);

  useEffect(() => {
    if (browseRoute.kind !== "publishers") return;
    const controller = new AbortController();
    void fetchPublishers(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setPublisherState({ attempt: publisherAttempt, items, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setPublisherState({ attempt: publisherAttempt, items: null, error: messageForError(error, "기업 블로그 목록을 불러오지 못했어요.") });
      });
    return () => controller.abort();
  }, [browseRoute.kind, publisherAttempt]);

  useEffect(() => {
    if (browseRoute.kind !== "digest-weeks") return;
    const controller = new AbortController();
    void fetchDigestWeeks(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setDigestWeeksState({ attempt: digestWeeksAttempt, items, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setDigestWeeksState({ attempt: digestWeeksAttempt, items: null, error: messageForError(error, "주간 큐레이션을 불러오지 못했어요.") });
      });
    return () => controller.abort();
  }, [browseRoute.kind, digestWeeksAttempt]);

  useEffect(() => {
    if (browseRoute.kind !== "digest") return;
    const week = browseRoute.week.week;
    const controller = new AbortController();
    void fetchDigest(week, controller.signal)
      .then((digest) => {
        if (!controller.signal.aborted) setDigestState({ key: week, attempt: digestAttempt, digest, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setDigestState({ key: week, attempt: digestAttempt, digest: null, error: messageForError(error, "주간 큐레이션을 불러오지 못했어요.") });
      });
    return () => controller.abort();
  }, [browseRoute, digestAttempt]);

  useEffect(() => {
    if (browseRoute.kind !== "home" || activeTab !== "latest" || searchQuery.length < API_SEARCH_MIN_LENGTH) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setSearchState({ query: searchQuery, results: null, loading: true, error: null });
      void searchFeed(searchQuery, controller.signal)
        .then((results) => {
          if (!controller.signal.aborted) setSearchState({ query: searchQuery, results, loading: false, error: null });
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) setSearchState({ query: searchQuery, results: null, loading: false, error: messageForError(error, "검색 결과를 불러오지 못했어요.") });
        });
    }, 320);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [activeTab, browseRoute.kind, searchAttempt, searchQuery]);

  useEffect(() => {
    const onPopState = () => {
      setBrowseRoute(routeFromHistory(window.history.state?.techgotganRoute));
      setSelectedId(new URLSearchParams(window.location.search).get("article"));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    void fetchArticle(selectedId, controller.signal)
      .then((article) => {
        if (!controller.signal.aborted) setDetailState({ articleId: selectedId, article, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setDetailState({ articleId: selectedId, article: null, loading: false, error: messageForError(error, "글을 불러오지 못했어요.") });
      });
    return () => controller.abort();
  }, [selectedId]);

  useEffect(() => {
    if (!isTossRuntime()) return;
    void NavigationBar.setOptions({ withBackButton: Boolean(selectedId) || browseRoute.kind !== "home", withTitle: true }).catch(() => undefined);
  }, [browseRoute.kind, selectedId]);

  const localSavedList = useMemo(() => [...savedArticles.values()].reverse(), [savedArticles]);
  const visibleArticles = useMemo(() => {
    const normalizedQuery = searchQuery.toLocaleLowerCase("ko-KR");
    const source = browseRoute.kind === "publisher"
      ? articles
      : activeTab === "saved"
      ? localSavedList.filter((article) => !normalizedQuery || [article.title, article.excerpt ?? "", article.source?.title ?? "", ...article.tags].join(" ").toLocaleLowerCase("ko-KR").includes(normalizedQuery))
      : isSearching ? currentSearch?.results ?? [] : articles;

    return source.filter((article) => category === "all" || article.category === category);
  }, [activeTab, articles, browseRoute.kind, category, currentSearch, isSearching, localSavedList, searchQuery]);

  function toggleSaved(article: Article) {
    const next = new Map(savedArticles);
    if (next.has(article.id)) next.delete(article.id);
    else next.set(article.id, article);
    setSavedArticles(next);
    saveSavedArticles(next);
  }

  function markRead(articleId: string) {
    if (readIds.has(articleId)) return;
    const next = new Set(readIds);
    next.add(articleId);
    setReadIds(next);
    saveReadIds(next);
  }

  function openArticle(articleId: string) {
    window.history.pushState({ techgotganArticle: articleId, techgotganRoute: browseRoute }, "", detailUrl(articleId));
    setSelectedId(articleId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateTo(route: BrowseRoute) {
    window.history.pushState({ techgotganRoute: route }, "", detailUrl(null));
    setBrowseRoute(route);
    setSelectedId(null);
    if (route.kind === "publisher") {
      setActiveTab("latest");
      setCategory("all");
      setQuery("");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateBack() {
    if (window.history.state?.techgotganRoute) {
      window.history.back();
      return;
    }
    setBrowseRoute({ kind: "home" });
  }

  function closeArticle() {
    if (window.history.state?.techgotganArticle === selectedId) {
      window.history.back();
      return;
    }
    window.history.replaceState(window.history.state, "", detailUrl(null));
    setSelectedId(null);
  }

  async function openOriginal(url: string, articleId: string) {
    const safeUrl = safeExternalUrl(url);
    if (!safeUrl) return;
    markRead(articleId);
    if (isTossRuntime()) {
      try {
        await Device.openURL(safeUrl);
        return;
      } catch {
        // If the native bridge is unavailable, retain a usable browser path.
      }
    }
    window.open(safeUrl, "_blank", "noopener,noreferrer");
  }

  const listLoading = browseRoute.kind === "publisher"
    ? feedLoading
    : browseRoute.kind === "home" && activeTab === "latest" && (isSearching ? !currentSearch || currentSearch.loading : feedLoading);
  const listError = browseRoute.kind === "publisher"
    ? feedError
    : browseRoute.kind === "home" && activeTab === "latest" && (isSearching ? currentSearch?.error ?? null : feedError);
  const currentPublishersLoading = browseRoute.kind === "publishers" && currentPublishers === null && publisherError === null;
  const currentDigestWeeksLoading = browseRoute.kind === "digest-weeks" && currentDigestWeeks === null && digestWeeksError === null;
  const currentDigestLoading = browseRoute.kind === "digest" && currentDigest === null && digestError === null;

  return (
    <div className="app-frame">
      <header className="topbar">
        <span className="brand-icon" role="img" aria-label="테크곳간" />
        <div className="brand-wordmark">
          <span className="brand-name">테크곳간</span>
          <span className="brand-caption">기업 기술 블로그 모아보기</span>
        </div>
      </header>

      {selectedId ? (
        <ArticleDetailView
          article={detail}
          loading={detailLoading}
          error={detailError}
          onBack={closeArticle}
          onOpenOriginal={openOriginal}
        />
      ) : browseRoute.kind === "home" || browseRoute.kind === "publisher" ? (
        <main className="feed-screen">
          <section className="intro-block" aria-labelledby="page-title">
            {browseRoute.kind === "publisher" ? (
              <>
                <button className="back-link feed-back-link" type="button" onClick={navigateBack}><span aria-hidden="true">←</span> 회사 목록</button>
                <div className="intro-kicker"><span className="live-dot" /> 회사 기술 블로그</div>
                <h1 id="page-title">{browseRoute.publisher.title || "기술 블로그"}</h1>
                <p>이 블로그에서 최근에 올라온 글이에요.</p>
              </>
            ) : (
              <>
                <div className="intro-kicker"><span className="live-dot" /> 새 글을 모았어요</div>
                <h1 id="page-title">기술 블로그의 새 글을<br />한곳에서 찾아 읽어요</h1>
                <p>여러 회사의 개발 이야기와 문제 해결 경험을 모았어요.</p>
              </>
            )}
          </section>

          {browseRoute.kind === "home" && <label className="search-field">
            <SearchIcon />
            <span className="sr-only">기술 블로그 글 검색</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="기술, 도구, 문제를 검색해요"
              enterKeyHint="search"
              autoComplete="off"
            />
            {query && <button className="clear-search" type="button" onClick={() => setQuery("")} aria-label="검색어 지우기">×</button>}
          </label>}

          {browseRoute.kind === "home" && <nav className="feed-tabs" aria-label="글 목록">
            <button type="button" className={activeTab === "latest" ? "active" : ""} aria-pressed={activeTab === "latest"} onClick={() => setActiveTab("latest")}>
              최신 글 <span>{articles.length || ""}</span>
            </button>
            <button type="button" className={activeTab === "saved" ? "active" : ""} aria-pressed={activeTab === "saved"} onClick={() => setActiveTab("saved")}>
              저장한 글 <span>{savedArticles.size || ""}</span>
            </button>
          </nav>}

          {browseRoute.kind === "home" && <div className="browse-shortcuts" aria-label="더 둘러보기">
            <button type="button" onClick={() => navigateTo({ kind: "publishers" })}>
              <span className="shortcut-icon" aria-hidden="true">⌂</span>
              <span><strong>회사별 블로그</strong><small>관심 있는 회사를 찾아봐요</small></span>
              <span className="shortcut-arrow" aria-hidden="true">→</span>
            </button>
            <button type="button" onClick={() => navigateTo({ kind: "digest-weeks" })}>
              <span className="shortcut-icon digest-shortcut-icon" aria-hidden="true">✳</span>
              <span><strong>주간 큐레이션</strong><small>한 주의 개발 이야기를 모았어요</small></span>
              <span className="shortcut-arrow" aria-hidden="true">→</span>
            </button>
          </div>}

          <div className="category-rail" role="group" aria-label="주제 고르기">
            {CATEGORIES.map((item) => (
              <button
                className={`category-chip${category === item.id ? " active" : ""}`}
                type="button"
                key={item.id}
                aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <section className="feed-section" aria-live="polite">
            <div className="section-heading">
              <div>
                <h2>{browseRoute.kind === "publisher" ? "최근 글" : activeTab === "saved" ? "저장한 글" : isSearching ? "검색 결과" : "최신 글"}</h2>
                {browseRoute.kind === "publisher" ? <p>이 회사 블로그에서 올라온 글이에요</p> : activeTab === "saved"
                  ? <p>저장한 글은 이 토스 앱에서만 볼 수 있어요</p>
                  : !isSearching && <p>최근 올라온 기술 블로그 글이에요</p>}
              </div>
              {!listLoading && !listError && <span className="result-count">{visibleArticles.length}편</span>}
            </div>

            {browseRoute.kind === "home" && query.trim().length === 1 && activeTab === "latest" && (
              <p className="search-hint">두 글자 이상 입력하면 전체 글을 검색해요.</p>
            )}
            {listLoading && <LoadingCards />}
            {listError && <ErrorState message={listError} onRetry={() => {
              if (isSearching && browseRoute.kind === "home") setSearchAttempt((attempt) => attempt + 1);
              else setFeedAttempt((attempt) => attempt + 1);
            }} />}
            {!listLoading && !listError && visibleArticles.length === 0 && (
              <EmptyState saved={browseRoute.kind === "home" && activeTab === "saved"} searching={browseRoute.kind === "home" && Boolean(query.trim())} />
            )}
            {!listLoading && !listError && visibleArticles.length > 0 && (
              <>
                <div className="article-list">
                  {visibleArticles.slice(0, visibleCount).map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      isSaved={savedArticles.has(article.id)}
                      isRead={readIds.has(article.id)}
                      onOpen={openArticle}
                      onToggleSaved={toggleSaved}
                    />
                  ))}
                </div>
                {visibleCount < visibleArticles.length && (
                    <button className="load-more" type="button" onClick={() => setPageState({ key: listKey, count: visibleCount + PAGE_SIZE })}>
                    글 더 보기 <span aria-hidden="true">↓</span>
                  </button>
                )}
              </>
            )}
          </section>

          <footer className="feed-footer">
            <span>글은 원문 발행처에서 이어 읽을 수 있어요.</span>
          </footer>
        </main>
      ) : browseRoute.kind === "publishers" ? (
        <main className="catalog-screen">
          <button type="button" className="back-link" onClick={navigateBack}><span aria-hidden="true">←</span> 최신 글</button>
          <section className="route-intro">
            <div className="intro-kicker"><span className="live-dot" /> 골라 읽기</div>
            <h1>회사별 블로그</h1>
            <p>관심 있는 회사의 개발 이야기를 모아 읽어요.</p>
          </section>
          {currentPublishersLoading && <LoadingRows />}
          {publisherError && <ErrorState message={publisherError} onRetry={() => setPublisherAttempt((attempt) => attempt + 1)} />}
          {!currentPublishersLoading && !publisherError && currentPublishers?.length === 0 && <EmptyState saved={false} searching={false} />}
          {!currentPublishersLoading && !publisherError && Boolean(currentPublishers?.length) && (
            <div className="publisher-list">
              {currentPublishers?.map((publisher) => (
                <button type="button" key={publisher.id} className="publisher-row" onClick={() => navigateTo({ kind: "publisher", publisher })}>
                  <span className="publisher-placeholder" aria-hidden="true">{(publisher.title || "기").slice(0, 1)}</span>
                  <span className="publisher-row-copy"><strong>{publisher.title || "기술 블로그"}</strong><small>{publisher.site_url}</small></span>
                  <span className="publisher-arrow" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          )}
        </main>
      ) : browseRoute.kind === "digest-weeks" ? (
        <main className="catalog-screen">
          <button type="button" className="back-link" onClick={navigateBack}><span aria-hidden="true">←</span> 최신 글</button>
          <section className="route-intro">
            <div className="intro-kicker"><span className="live-dot" /> 한 주의 발견</div>
            <h1>주간 큐레이션</h1>
            <p>이번 주에 나온 기술 이야기를 한눈에 살펴봐요.</p>
          </section>
          {currentDigestWeeksLoading && <LoadingRows />}
          {digestWeeksError && <ErrorState message={digestWeeksError} onRetry={() => setDigestWeeksAttempt((attempt) => attempt + 1)} />}
          {!currentDigestWeeksLoading && !digestWeeksError && currentDigestWeeks?.length === 0 && <EmptyState saved={false} searching={false} />}
          {!currentDigestWeeksLoading && !digestWeeksError && Boolean(currentDigestWeeks?.length) && (
            <div className="digest-week-list">
              {currentDigestWeeks?.map((week) => (
                <button type="button" key={week.week} className="digest-week-card" onClick={() => navigateTo({ kind: "digest", week })}>
                  <span className="digest-week-kicker">주간 모음</span>
                  <strong>{week.label}</strong>
                  <span className="digest-week-range">{week.dateRangeLabel}</span>
                  <span className="digest-week-count">글 {week.articleCount}편 <span aria-hidden="true">→</span></span>
                </button>
              ))}
            </div>
          )}
        </main>
      ) : (
        <main className="catalog-screen">
          <button type="button" className="back-link" onClick={navigateBack}><span aria-hidden="true">←</span> 주간 큐레이션</button>
          <section className="route-intro digest-route-intro">
            <div className="intro-kicker"><span className="live-dot" /> {browseRoute.week.dateRangeLabel}</div>
            <h1>{browseRoute.week.label}</h1>
            <p>한 주 동안 새로 올라온 개발 이야기 {browseRoute.week.articleCount}편을 모았어요.</p>
          </section>
          {currentDigestLoading && <LoadingCards />}
          {digestError && <ErrorState message={digestError} onRetry={() => setDigestAttempt((attempt) => attempt + 1)} />}
          {currentDigest && <>
            <section className="digest-breakdown" aria-label="이번 주 글 모아보기">
              <DigestDistribution title="주제별" items={currentDigest.categoryDistribution} />
              <DigestDistribution title="회사별" items={currentDigest.sourceDistribution} />
            </section>
            <section className="feed-section digest-articles">
              <div className="section-heading"><div><h2>이번 주 새 글</h2><p>관심 있는 글을 골라 읽어보세요</p></div><span className="result-count">{currentDigest.latestArticles.length}편</span></div>
              <div className="article-list">
                {currentDigest.latestArticles.map((article) => <ArticleCard key={article.id} article={article} isSaved={savedArticles.has(article.id)} isRead={readIds.has(article.id)} onOpen={openArticle} onToggleSaved={toggleSaved} />)}
              </div>
            </section>
          </>}
        </main>
      )}
    </div>
  );
}

function LoadingRows() {
  return <div className="loading-rows" aria-label="목록을 불러오는 중"><span /><span /><span /><span /></div>;
}

function DigestDistribution({ title, items }: { title: string; items: Array<{ label: string; count: number; percentage: number }> }) {
  if (!items.length) return null;
  return (
    <section className="digest-distribution">
      <h2>{title}</h2>
      <ul>
        {items.slice(0, 5).map((item) => (
          <li key={item.label}>
            <div className="distribution-label"><span>{item.label}</span><strong>{item.count}편</strong></div>
            <span className="distribution-track"><span style={{ width: `${Math.max(0, Math.min(100, item.percentage))}%` }} /></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArticleDetailView({
  article,
  loading,
  error,
  onBack,
  onOpenOriginal,
}: {
  article: ArticleDetail | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onOpenOriginal: (url: string, articleId: string) => void;
}) {
  return (
    <main className="detail-screen">
      <button type="button" className="back-link" onClick={onBack}><span aria-hidden="true">←</span> 목록으로</button>
      {loading && <DetailSkeleton />}
      {!loading && error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
      {!loading && article && (
        <article className="detail-article">
          <div className="detail-meta">
            <span>{article.sourceTitle ?? "기술 블로그"}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(article.publishedAt)}</span>
            <span className="category-pill">{CATEGORY_LABELS[article.category] ?? "기술 글"}</span>
          </div>
          <h1>{article.title}</h1>
          {article.tags.length > 0 && (
            <div className="tag-list" aria-label="글 태그">
              {article.tags.slice(0, 6).map((tag) => <span key={tag}>#{tag}</span>)}
            </div>
          )}
          {article.summary ? (
            <section className="summary-panel" aria-labelledby="summary-title">
              <div className="summary-heading">
                <span className="summary-spark" aria-hidden="true">✳</span>
                <div>
                  <h2 id="summary-title">AI 엔지니어링 브리핑</h2>
                  <p>{article.summaryBasis === "full_article" ? "원문을 바탕으로 정리했어요" : article.summaryBasis === "partial_article" ? "확인한 원문 일부를 정리했어요" : "소개 글을 바탕으로 정리했어요"}</p>
                </div>
              </div>
              <p className="summary-lead">{renderInlineSummary(article.summary.lead)}</p>
              <ul>
                {article.summary.keyPoints.map((point, index) => <li key={`${index}-${point}`}>{renderInlineSummary(point)}</li>)}
              </ul>
            </section>
          ) : (
            <section className="excerpt-panel">
              <h2>{article.summaryStatus === "pending" || article.summaryStatus === "processing" ? "요약을 준비하고 있어요" : "글 소개"}</h2>
              <p>{article.excerpt || "원문 발행처에서 글의 자세한 내용을 확인할 수 있어요."}</p>
            </section>
          )}
          <button className="source-button" type="button" onClick={() => onOpenOriginal(article.url, article.id)}>
            원문 읽기 <span aria-hidden="true">↗</span>
          </button>
          <p className="source-note">원문은 글을 쓴 회사 블로그에서 열려요.</p>
        </article>
      )}
    </main>
  );
}

function LoadingCards() {
  return (
    <div className="article-list" aria-label="글을 불러오는 중">
      {[0, 1, 2].map((item) => <div className="article-skeleton" key={item}><span /><span /><span /></div>)}
    </div>
  );
}

function DetailSkeleton() {
  return <div className="detail-skeleton" aria-label="글을 불러오는 중"><span /><span /><span /><span /></div>;
}

function EmptyState({ saved, searching }: { saved: boolean; searching: boolean }) {
  const title = saved ? "저장한 글을 모아둘게요" : searching ? "검색 결과가 없어요" : "새 글을 모으고 있어요";
  const body = saved ? "관심 있는 글의 책갈피를 눌러 저장해 보세요." : searching ? "기술 이름이나 다른 검색어를 입력해 보세요." : "잠시 뒤 다시 확인해 주세요.";
  return <div className="empty-state"><span className="empty-mark" aria-hidden="true">{saved ? "＋" : "⌕"}</span><strong>{title}</strong><p>{body}</p></div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="error-state" role="alert"><span>{message}</span>{onRetry && <button type="button" onClick={onRetry}>다시 불러오기</button>}</div>;
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none"><circle cx="10.8" cy="10.8" r="6.3" stroke="currentColor" strokeWidth="1.8" /><path d="m15.5 15.5 4.1 4.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}
