import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getPublicGraphSeed } from "@/lib/data/dev-article-graph";

export default async function DevConnectionsStart() {
  if (process.env.NODE_ENV !== "development") notFound();
  await connection();
  const id = await getPublicGraphSeed();
  if (!id) return <main><h1>글 연결 지도</h1><p>공개 글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p></main>;
  redirect(`/articles/${encodeURIComponent(id)}/connections`);
}
