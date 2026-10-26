"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  listArticles,
  markAllArticlesRead,
  markAllArticlesUnread,
  markArticleRead,
  markArticleReadAndIncrementClickCount,
  markArticleUnread,
  searchArticles,
  setArticleFavorite,
  type ArticleListItem,
} from "@/lib/data/articles";
import { getArticlePreview, getRelatedArticles, type ArticlePreview, type RelatedArticle } from "@/lib/data/related-articles";
import { getCurrentUser, getVerifiedUserId } from "@/lib/supabase/current-user";
import { canViewArticleSummary } from "@/lib/article-summary-access";

async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

async function getArticleReadUserId(): Promise<string | null> {
  try {
    // Feed state is attached with getCurrentUser(). Use the same verified Auth identity for
    // writes so the read row is queried under exactly the same user ID after a reload.
    const userId = await getCurrentUserId();
    if (userId) return userId;
  } catch (error) {
    console.warn("Auth user lookup failed while saving article read state; retrying with verified claims:", error);
  }

  try {
    return await getVerifiedUserId();
  } catch (error) {
    console.error("Verified JWT claim fallback failed while saving article read state:", error);
    return null;
  }
}

// 즐겨찾기/전체 읽음 처리처럼 사용자가 명시적으로 누르는 상호작용은 로그인이 필요하다 — 현재 페이지로
// 되돌아올 수 있도록 referer를 next로 실어 로그인 화면으로 보낸다 (docs/decisions.md 참고).
async function redirectToLogin(): Promise<never> {
  const referer = (await headers()).get("referer");
  const next = referer ? new URL(referer).pathname + new URL(referer).search : "/";
  redirect(`/login?next=${encodeURIComponent(next)}`);
}

export async function markArticleReadAction(articleId: string): Promise<"saved" | "unauthenticated" | "failed"> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId)) {
    return "failed";
  }
  const userId = await getArticleReadUserId();

  // 클릭 수는 RPC로 집계하고, 읽음 상태는 아래에서 테이블에 직접 upsert한다.
  // 읽음 처리는 열람(누구나 자유)에 곁들여지는 부수 효과라, 로그인 안 한 사람은 로그인으로 보내는 대신
  // (링크를 새 탭에서 여는 도중 원래 탭이 로그인 화면으로 튀는 건 나쁜 경험) 그냥 조용히 건너뛴다.
  try {
    await markArticleReadAndIncrementClickCount(userId, articleId);
  } catch (error) {
    // The counter RPC can be deployed with an older function body that increments clicks but
    // does not write read_status. Keep article reading independent from that migration state.
    console.error("markArticleReadAction 클릭 수 RPC 실패:", error);
  }
  if (!userId) return "unauthenticated";

  try {
    // Idempotent upsert guarantees the row exists even if the production RPC reports success
    // without applying its read_status write.
    await markArticleRead(userId, articleId);
  } catch (error) {
    console.error("markArticleReadAction 읽음 상태 upsert 실패:", error);
    return "failed";
  }

  // 주의: 여기서 revalidatePath("/")를 호출하면 기사 클릭 시 열린 인터셉트 모달(@modal)이
  // 활성 경로(/articles/[id])의 서버 재검증(refresh)에 의해 파괴되어 전체 페이지로 튕기는 버그가 발생함.
  // 읽음 표시는 ArticleList의 로컬 상태에 즉시 반영되므로
  // DB에만 안전하게 반영하고 캐시 무효화 라우팅 트리거는 생략한다.
  if (!userId) return "unauthenticated";
  return "saved";
}

/**
 * Persist a read state after the intercepted preview actually mounts in the browser.
 * Keep this mutation out of the Server Component render path because Next can render
 * dynamic routes while prefetching links the user has not opened.
 */
export async function markArticleReadFallbackAction(articleId: string): Promise<"saved" | "unauthenticated" | "failed"> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId)) {
    return "failed";
  }
  try {
    const userId = await getArticleReadUserId();
    if (!userId) return "unauthenticated";
    await markArticleRead(userId, articleId);
    return "saved";
  } catch (error) {
    console.error("Fallback article read persistence failed:", error);
    return "failed";
  }
}

export async function getArticlePreviewAction(articleId: string): Promise<{
  article: ArticlePreview;
  related: RelatedArticle[];
} | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId)) {
    return null;
  }
  const user = await getCurrentUser();
  const articlePromise = getArticlePreview(articleId, { includeSummary: canViewArticleSummary(user?.email) });
  const relatedPromise = getRelatedArticles(articleId);

  const [article, initialRelated] = await Promise.all([articlePromise, relatedPromise]);
  if (!article) return null;

  const related = initialRelated.length > 0
    ? initialRelated
    : await getRelatedArticles(article.id, article.category, article.tags);

  return { article, related };
}

export async function getRelatedArticlesAction(articleId: string): Promise<RelatedArticle[]> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId)) {
    return [];
  }
  const initialRelated = await getRelatedArticles(articleId);
  if (initialRelated.length > 0) return initialRelated;
  const article = await getArticlePreview(articleId);
  return article ? getRelatedArticles(article.id, article.category, article.tags) : [];
}

export async function markArticleUnreadAction(formData: FormData): Promise<"ok" | "unauthenticated"> {
  const id = String(formData.get("id") ?? "");
  if (!id) return "ok";
  const userId = await getArticleReadUserId();
  if (!userId) return "unauthenticated";
  await markArticleUnread(userId, id);
  return "ok";
}

export async function toggleArticleFavoriteAction(formData: FormData): Promise<"ok" | "unauthenticated"> {
  const id = String(formData.get("id") ?? "");
  const nextFavorite = formData.get("nextFavorite") === "true";
  if (!id) return "ok";
  const userId = await getCurrentUserId();
  if (!userId) return "unauthenticated";
  await setArticleFavorite(userId, id, nextFavorite);
  return "ok";
}

export async function markAllArticlesReadAction(): Promise<"ok" | "unauthenticated"> {
  const userId = await getCurrentUserId();
  if (!userId) return "unauthenticated";
  await markAllArticlesRead(userId);
  return "ok";
}

export async function markAllArticlesUnreadAction() {
  const userId = await getCurrentUserId();
  if (!userId) return redirectToLogin();
  await markAllArticlesUnread(userId);
  revalidatePath("/");
}

/**
 * 검색어가 바뀔 때 클라이언트(ArticleList)에서 직접 호출한다 — 예전엔 router.replace로 페이지
 * 전체를 다시 요청해서 스켈레톤이 재노출되고 검색과 무관한 listSources()까지 매번 다시 조회됐는데,
 * 서버 액션으로 이 데이터만 받아와 클라이언트 상태를 갈아끼우는 방식으로 바꿔 그 왕복을 없앤다.
 * page.tsx의 초기 렌더 분기(검색어 유무에 따라 searchArticles/listArticles)와 동일한 로직을 공유.
 */
export async function loadArticlesAction(query: string): Promise<ArticleListItem[]> {
  const userId = await getCurrentUserId();
  const trimmed = query.trim();
  return trimmed ? searchArticles(trimmed, userId) : listArticles(userId);
}
