import { notFound } from "next/navigation";
import { after } from "next/server";
import { ArticlePreviewPanel } from "@/components/article-preview-panel";
import { getArticlePreview } from "@/lib/data/related-articles";
import { markArticleRead } from "@/lib/data/articles";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { canViewArticleSummary } from "@/lib/article-summary-access";

export async function ArticlePreviewRoute({ articleId }: { articleId: string }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId)) notFound();

  let article = null;
  let user = null;
  try {
    const currentUser = await getCurrentUser().catch((error) => {
      console.error("Failed to resolve user for article read fallback:", error);
      return null;
    });
    const fetchedArticle = await getArticlePreview(articleId, {
      includeSummary: canViewArticleSummary(currentUser?.email),
    });
    article = fetchedArticle;
    user = currentUser;
  } catch (error) {
    console.error("Failed to fetch article preview in intercepted modal:", error);
  }

  if (!article) notFound();

  // The click action writes immediately, but a hard reload can interrupt its request.
  // `prefetch="auto"` stops at this route's loading boundary, so this fallback only runs
  // when the article page is actually rendered for navigation, not while links are prefetched.
  if (user) {
    const openedArticleId = article.id;
    after(async () => {
      try {
        await markArticleRead(user.id, openedArticleId);
      } catch (error) {
        console.error("Failed to persist article read state after preview response:", error);
      }
    });
  }

  return <ArticlePreviewPanel article={article} related={[]} canViewSummary={canViewArticleSummary(user?.email)} />;
}
