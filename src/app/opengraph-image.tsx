import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "./seo";

export const alt = SITE_NAME;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "flex-start",
          background: "linear-gradient(135deg, #F7F7FC 0%, #E9F1FF 100%)",
          color: "#171719",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "80px 96px",
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", marginBottom: 28 }}>
          <div
            style={{
              alignItems: "center",
              background: "#FF6600",
              borderRadius: 18,
              display: "flex",
              height: 64,
              justifyContent: "center",
              marginRight: 18,
              width: 64,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 5, width: 38 }}>
              <div style={{ background: "#FFFFFF", borderRadius: 8, height: 6 }} />
              <div style={{ background: "#FFFFFF", borderRadius: 8, height: 6 }} />
              <div style={{ background: "#FFFFFF", borderRadius: 8, height: 6 }} />
            </div>
          </div>
          <div style={{ color: "#C94F00", display: "flex", fontSize: 38, fontWeight: 700 }}>테크곳간</div>
        </div>
        <div style={{ display: "flex", fontSize: 78, letterSpacing: "-3px", lineHeight: 1.2 }}>
          테크 글을 곳간에 모아
          <br />
          한곳에서 읽어요
        </div>
        <div style={{ color: "#5C5C66", display: "flex", fontSize: 30, lineHeight: 1.5, marginTop: 32 }}>
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    size,
  );
}
