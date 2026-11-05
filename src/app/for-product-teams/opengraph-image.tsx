import { ImageResponse } from "next/og";

export const alt = "기획자와 개발자가 기업 기술 사례를 찾는 테크곳간";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ProductTeamsOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "54px 60px",
          color: "#201a16",
          background: "#fbfaf8",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 5,
                width: 48,
                height: 48,
                padding: 10,
                borderRadius: 14,
                background: "#c94c00",
              }}
            >
              <div style={{ height: 5, borderRadius: 8, background: "#fff" }} />
              <div style={{ height: 5, borderRadius: 8, background: "#fff" }} />
              <div style={{ height: 5, borderRadius: 8, background: "#fff" }} />
            </div>
            <div style={{ display: "flex", marginLeft: 14, color: "#a14614", fontSize: 27, fontWeight: 700 }}>
              테크곳간
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", color: "#9a3412", fontSize: 21, fontWeight: 700 }}>
              기획자 · 개발자용 사례 검색
            </div>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 55, fontWeight: 700, lineHeight: 1.2 }}>
              <div style={{ display: "flex" }}>제품을 기획하고 구현할 때,</div>
              <div style={{ display: "flex" }}>회사 기술 사례를 찾아보세요</div>
            </div>
            <div style={{ display: "flex", color: "#5c5c66", fontSize: 25 }}>
              공개 기술 블로그 검색 · 원문으로 이어 읽기
            </div>
          </div>

          <div style={{ display: "flex", color: "#77717a", fontSize: 20 }}>
            검색과 원문 읽기는 가입 없이 이용할 수 있습니다
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, width: 350, marginLeft: 36 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, padding: "22px 24px", border: "1px solid #e7e5e4", borderRadius: 18, background: "#fff" }}>
            <div style={{ display: "flex", color: "#9a3412", fontSize: 19, fontWeight: 700 }}>기획자 · 제품 조사</div>
            <div style={{ display: "flex", color: "#292524", fontSize: 23, fontWeight: 600 }}>추천 · 검색 · 결제 사례</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, padding: "22px 24px", border: "1px solid #e7e5e4", borderRadius: 18, background: "#fff" }}>
            <div style={{ display: "flex", color: "#9a3412", fontSize: 19, fontWeight: 700 }}>개발자 · 구현 사례</div>
            <div style={{ display: "flex", color: "#292524", fontSize: 23, fontWeight: 600 }}>Frontend · Backend · AI/ML</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, color: "#67615d", fontSize: 18 }}>
            <div style={{ display: "flex", width: 8, height: 8, borderRadius: 99, background: "#c94c00" }} />
            기업이 공개한 원문으로 확인
          </div>
        </div>
      </div>
    ),
    size,
  );
}
