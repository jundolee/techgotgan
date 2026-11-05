"use client";

import { getAcquisitionContext } from "@/lib/acquisition-context";
import { queueAmplitudeEvent } from "@/lib/amplitude-event-queue";

export type SourceArticleSurface =
  | "article_transition"
  | "article_preview_loading"
  | "article_preview"
  | "article_detail"
  | "weekly_digest"
  | "career_guide"
  | "editorial_guide";

/** Record an outbound source click without eagerly loading the analytics SDK. */
export function trackSourceArticleClick(sourceUrl: string, surface: SourceArticleSurface): void {
  let sourceHost: string;
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return;
    sourceHost = url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return;
  }

  queueAmplitudeEvent("source_article_click", {
    source_host: sourceHost,
    surface,
    ...getAcquisitionContext(),
  });
}
