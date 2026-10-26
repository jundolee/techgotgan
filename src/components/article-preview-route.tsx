import { notFound } from "next/navigation";
import { ArticlePreviewPanel } from "@/components/article-preview-panel";
import { getArticlePreview } from "@/lib/data/related-articles";

export async function ArticlePreviewRoute({ articleId }: { articleId: string }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId)) notFound();

  let article = null;
  try {
    article = await getArticlePreview(articleId);
  } catch (error) {
    console.error("Failed to fetch article preview in intercepted modal:", error);
  }

  if (!article) notFound();

  return <ArticlePreviewPanel article={article} related={[]} />;
}
