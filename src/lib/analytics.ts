"use client";

import { track } from "@amplitude/analytics-browser";

/** Send search quality metrics without collecting the text a reader searched for. */
export function trackArticleSearchCompleted(
  query: string,
  resultCount: number,
  category: string,
  hasSourceFilter: boolean
): void {
  if (
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" ||
    !process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY
  ) return;

  const normalizedQuery = query.trim();
  if (!normalizedQuery) return;

  track("article_search_completed", {
    query_length: Array.from(normalizedQuery).length,
    term_count: normalizedQuery.split(/\s+/u).filter(Boolean).length,
    result_count: resultCount,
    category: category === "all" ? null : category,
    has_source_filter: hasSourceFilter,
  });
}

/** Record completed share actions without sending article titles, IDs, or URLs. */
export function trackShareActionCompleted(
  method: "web_share" | "link_copy",
  surface: "article" | "weekly_digest" | "career_guide"
): void {
  if (
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" ||
    !process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY
  ) return;

  track("share_action_completed", {
    share_method: method,
    share_surface: surface,
  });
}

/** Measure graph exploration without collecting article IDs, titles, or search text. */
export function trackArticleGraphInteraction(
  action: "node_selected" | "neighbors_loaded" | "detail_opened" | "insight_shown",
  properties: { node_kind?: string; graph_size?: number; added_nodes?: number; added_edges?: number }
): void {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" || !process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY) return;
  track("article_graph_interaction", { action, ...properties });
}
