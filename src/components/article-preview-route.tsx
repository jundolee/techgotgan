import { notFound } from "next/navigation";
import { after } from "next/server";
import { ArticlePreviewPanel } from "@/components/article-preview-panel";
import { getArticlePreview } from "@/lib/data/related-articles";
import { markArticleRead } from "@/lib/data/articles";
import { getVerifiedUserId } from "@/lib/supabase/current-user";

export async function ArticlePreviewRoute({ articleId }: { articleId: string }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId)) notFound();

  let article = null;
  try {
    const userIdPromise = getVerifiedUserId().catch((error) => {
      console.error("Failed to verify user for article read fallback:", error);
      return null;
    });
    const [fetchedArticle, userId] = await Promise.all([getArticlePreview(articleId), userIdPromise]);
    article = fetchedArticle;
    if (article && userId) {
      const openedArticleId = article.id;
      // The click action writes immediately; this idempotent fallback protects against a
      // navigation that wins the race with that action without delaying the modal response.
      after(async () => {
        try {
          await markArticleRead(userId, openedArticleId);
        } catch (error) {
          console.error("Failed to persist article read state after preview render:", error);
        }
      });
    }
  } catch (error) {
    console.error("Failed to fetch article preview in intercepted modal:", error);
  }

  if (!article) notFound();

  return <ArticlePreviewPanel article={article} related={[]} />;
}
