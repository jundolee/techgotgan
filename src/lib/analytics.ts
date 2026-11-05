"use client";

import { getAcquisitionContext } from "@/lib/acquisition-context";
import { queueAmplitudeEvent } from "@/lib/amplitude-event-queue";

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

  queueAmplitudeEvent("article_search_completed", {
    query_length: Array.from(normalizedQuery).length,
    term_count: normalizedQuery.split(/\s+/u).filter(Boolean).length,
    result_count: resultCount,
    category: category === "all" ? null : category,
    has_source_filter: hasSourceFilter,
    ...getAcquisitionContext(),
  });
}

/** Measure which persona path a visitor chooses without collecting search text. */
export function trackAudienceLandingAction(
  action: "planner_search" | "developer_topic" | "mcp_setup"
): void {
  if (
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" ||
    !process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY
  ) return;

  queueAmplitudeEvent("audience_landing_action", { action, ...getAcquisitionContext() });
}

/** Record completed share actions without sending article titles, IDs, or URLs. */
export function trackShareActionCompleted(
  method: "web_share" | "link_copy",
  surface:
    | "article"
    | "weekly_digest"
    | "career_guide"
    | "topic_directory"
    | "topic_hub"
    | "blog_directory"
    | "blog_hub"
    | "audience_landing"
): void {
  if (
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" ||
    !process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY
  ) return;

  queueAmplitudeEvent("share_action_completed", {
    share_method: method,
    share_surface: surface,
    ...getAcquisitionContext(),
  });
}

/** Measure graph exploration without collecting article IDs, titles, or search text. */
export function trackArticleGraphInteraction(
  action: "node_selected" | "neighbors_loaded" | "detail_opened" | "insight_shown",
  properties: { node_kind?: string; graph_size?: number; added_nodes?: number; added_edges?: number }
): void {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" || !process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY) return;
  queueAmplitudeEvent("article_graph_interaction", { action, ...properties, ...getAcquisitionContext() });
}

export function trackCareerGuideInteraction(action: string, detail: string): void {
  queueAmplitudeEvent("career_guide_interaction", {
    guide: "toss_frontend",
    action,
    detail,
    ...getAcquisitionContext(),
  });
}

export type AuthMethod = "google" | "email_password";
export type AuthFlow = "login" | "signup";

export function trackAuthPageViewed(flow: AuthFlow): void {
  queueAmplitudeEvent("auth_page_viewed", {
    auth_flow: flow,
    ...getAcquisitionContext(),
  });
}

export function trackAuthAttemptStarted(authMethod: AuthMethod, flow: AuthFlow): void {
  queueAmplitudeEvent("auth_attempt_started", {
    auth_method: authMethod,
    auth_flow: flow,
    ...getAcquisitionContext(),
  });
}

export function trackAuthenticatedSessionStarted(authMethod: AuthMethod): void {
  queueAmplitudeEvent("authenticated_session_started", {
    auth_method: authMethod,
    ...getAcquisitionContext(),
  });
}
