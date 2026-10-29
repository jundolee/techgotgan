import { getArticleSocialImage } from "./social-image";

export const alt = "테크곳간에서 공유한 기술 글";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ArticleTwitterImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return getArticleSocialImage(params);
}
