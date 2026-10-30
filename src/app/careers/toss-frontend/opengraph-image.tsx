import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/app/seo";

export const alt = "토스 프론트엔드 지원 전 읽어볼 글 | 테크곳간";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function CareerGuideOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "60px 64px",
          color: "#201a16",
          background: "linear-gradient(135deg, #fff8f1 0%, #f2f5ff 100%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 5,
                width: 50,
                height: 50,
                padding: 10,
                borderRadius: 14,
                background: "#eb641c",
              }}
            >
              <div style={{ height: 5, borderRadius: 8, background: "#fff" }} />
              <div style={{ height: 5, borderRadius: 8, background: "#fff" }} />
              <div style={{ height: 5, borderRadius: 8, background: "#fff" }} />
            </div>
            <div style={{ display: "flex", marginLeft: 14, color: "#a14614", fontSize: 25, fontWeight: 700 }}>
              {SITE_NAME} · 프론트엔드 커리어 가이드
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                display: "flex",
                width: 520,
                alignItems: "center",
                padding: "9px 16px",
                border: "1px solid #fed7aa",
                borderRadius: 999,
                color: "#9a3412",
                background: "#fff",
                fontSize: 20,
              }}
            >
              공개 기술 글 3편 · 생각해볼 질문
            </div>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 60, fontWeight: 700, lineHeight: 1.18 }}>
              <div style={{ display: "flex" }}>토스 프론트엔드</div>
              <div style={{ display: "flex" }}>지원 전 읽어볼 글</div>
            </div>
            <div style={{ display: "flex", color: "#5c5c66", fontSize: 25 }}>
              협업 · 문서 탐색 · 기술 선택
            </div>
          </div>

          <div style={{ display: "flex", color: "#77717a", fontSize: 20 }}>
            테크곳간이 독립적으로 고른 읽기 자료
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 14, width: 245, marginLeft: 28 }}>
          {[
            ["01", "협업 경험"],
            ["02", "문서 탐색"],
            ["03", "기술 선택"],
          ].map(([number, label]) => (
            <div
              key={number}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "17px 18px",
                border: "1px solid #e7e5e4",
                borderRadius: 16,
                background: "rgba(255,255,255,0.82)",
              }}
            >
              <div style={{ display: "flex", color: "#c94f00", fontSize: 20, fontWeight: 700 }}>{number}</div>
              <div style={{ display: "flex", marginLeft: 12, color: "#38333a", fontSize: 22, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
