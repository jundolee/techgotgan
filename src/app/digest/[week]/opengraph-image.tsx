import { ImageResponse } from "next/og";
import { getWeeklyDigest, isValidDigestWeek } from "@/lib/data/weekly-digests";

export const alt = "테크곳간 주간 테크 큐레이션 공유 카드";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

type ImageProps = {
  params: Promise<{ week: string }>;
};

export default async function WeeklyDigestImage({ params }: ImageProps) {
  const { week } = await params;
  if (!isValidDigestWeek(week)) return new Response(null, { status: 404 });

  const digest = await getWeeklyDigest(week);
  if (!digest) return new Response(null, { status: 404 });

  const featuredCategory = digest.categoryDistribution[0];

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "linear-gradient(135deg, #f5f6ff 0%, #eef4ff 55%, #eaf8f7 100%)",
          color: "#171719",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "58px 72px 48px",
          width: "100%",
        }}
      >
        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
          <div style={{ color: "#315BDE", display: "flex", fontSize: 32, fontWeight: 700 }}>테크곳간</div>
          <div
            style={{
              background: "#ffffffcc",
              border: "1px solid #d8e0f3",
              borderRadius: 999,
              color: "#56617a",
              display: "flex",
              fontSize: 20,
              padding: "12px 20px",
            }}
          >
            주간 큐레이션
          </div>
        </div>

        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 680 }}>
            <div style={{ color: "#315BDE", display: "flex", fontSize: 25, fontWeight: 600, marginBottom: 18 }}>
              {digest.label} · {digest.dateRangeLabel}
            </div>
            <div style={{ display: "flex", fontSize: 58, fontWeight: 700, letterSpacing: -2, lineHeight: 1.18 }}>
              탭은 열 개 말고,
              <br />
              읽을 글부터 찾기.
            </div>
            <div style={{ color: "#626b7e", display: "flex", fontSize: 25, marginTop: 24 }}>
              회사 기술 블로그 새 글을 한곳에 모았습니다.
            </div>
          </div>

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e0e5ef",
              borderRadius: 28,
              boxShadow: "0 18px 45px rgba(49, 91, 222, 0.12)",
              display: "flex",
              flexDirection: "column",
              marginLeft: 44,
              padding: "32px 36px",
              width: 318,
            }}
          >
            <div style={{ color: "#687187", display: "flex", fontSize: 20 }}>이번 주 새 글</div>
            <div style={{ alignItems: "baseline", color: "#202b49", display: "flex", marginTop: 4 }}>
              <span style={{ fontSize: 96, fontWeight: 700, letterSpacing: -5 }}>{digest.articleCount}</span>
              <span style={{ color: "#687187", fontSize: 24, marginLeft: 10 }}>편</span>
            </div>
            {featuredCategory ? (
              <div
                style={{
                  background: "#eef2ff",
                  borderRadius: 16,
                  color: "#315BDE",
                  display: "flex",
                  fontSize: 21,
                  fontWeight: 600,
                  marginTop: 16,
                  padding: "13px 16px",
                }}
              >
                {featuredCategory.label} {featuredCategory.percentage}%
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ alignItems: "center", color: "#6c7382", display: "flex", fontSize: 18, justifyContent: "space-between" }}>
          <div>읽으려고 열어둔 탭은 잠깐 쉬게 두세요.</div>
          <div style={{ color: "#315BDE", fontWeight: 600 }}>www.techgotgan.co.kr</div>
        </div>
      </div>
    ),
    size,
  );
}
