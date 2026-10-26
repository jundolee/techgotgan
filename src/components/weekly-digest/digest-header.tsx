import Link from "next/link";
import { Text } from "@seed-design/react";
import { BrandLink } from "@/components/brand-link";
import { ShareButton } from "@/components/share-button";

export function DigestHeader({
  shareTitle,
  shareUrl,
}: {
  shareTitle?: string;
  shareUrl?: string;
}) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        paddingBottom: 20,
        marginBottom: 28,
        borderBottom: "1px solid var(--seed-color-stroke-neutral-subtle)",
      }}
    >
      <BrandLink />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {shareTitle && shareUrl ? (
          <ShareButton
            title={shareTitle}
            url={shareUrl}
            size="small"
            variant="neutralWeak"
            shareSurface="weekly_digest"
            shareCampaign="weekly_digest_share_2026q4"
          />
        ) : null}
        <Link href="/">
          <Text as="span" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)">
            최신 글 보기 →
          </Text>
        </Link>
      </div>
    </header>
  );
}
