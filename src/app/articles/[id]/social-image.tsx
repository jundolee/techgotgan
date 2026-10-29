import { ImageResponse } from "next/og";
import { getArticlePreview } from "@/lib/data/related-articles";
import { SITE_NAME } from "@/app/seo";

const size = { width: 1200, height: 630 };

export async function getArticleSocialImage(params: Promise<{ id: string }>) {
  const { id } = await params;
  const article = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? await getArticlePreview(id)
    : null;

  if (!article) {
    return new ImageResponse(
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#f7f7fc", color: "#171719", fontSize: 48 }}>
        {SITE_NAME}
      </div>,
      size,
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "64px 76px",
          color: "#171719",
          background: "linear-gradient(135deg, #fffaf5 0%, #f7f7fc 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 12, height: 42, borderRadius: 8, background: "#eb641c" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", color: "#a14614", fontSize: 25, fontWeight: 700 }}>{SITE_NAME}</div>
            <div style={{ display: "flex", color: "#686873", fontSize: 22 }}>{article.sourceTitle ?? article.category}</div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 700, letterSpacing: "-1.5px", lineHeight: 1.35 }}>
          {article.title.length > 80 ? `${article.title.slice(0, 78)}…` : article.title}
        </div>
        <div style={{ display: "flex", color: "#686873", fontSize: 24 }}>원문과 관련 글을 테크곳간에서 이어 읽기</div>
      </div>
    ),
    size,
  );
}
