"use client";

import { getAcquisitionContext } from "@/lib/acquisition-context";

export type SourceArticleSurface =
  | "article_transition"
  | "article_preview_loading"
  | "article_preview"
  | "article_detail"
  | "weekly_digest"
  | "career_guide";

/** Record an outbound source click without eagerly loading the analytics SDK. */
export function trackSourceArticleClick(sourceUrl: string, surface: SourceArticleSurface): void {
  if (
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" ||
    !process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY
  ) return;

  let sourceHost: string;
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return;
    sourceHost = url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return;
  }

  void import("@amplitude/analytics-browser")
    .then((amplitude) => amplitude.track("source_article_click", {
      source_host: sourceHost,
      surface,
      ...getAcquisitionContext(),
    }))
    .catch(() => {});
}
