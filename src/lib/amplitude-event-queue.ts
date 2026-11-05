"use client";

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;
export type QueuedAnalyticsEvent = { eventType: string; properties: AnalyticsProperties };

declare global {
  interface Window {
    __techgotganAmplitudeReady?: boolean;
    __techgotganAmplitudeQueue?: QueuedAnalyticsEvent[];
  }
}

const MAX_QUEUED_EVENTS = 100;

/** Preserve events triggered before the Amplitude SDK is initialized after LCP. */
export function queueAmplitudeEvent(eventType: string, properties: AnalyticsProperties): void {
  if (
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" ||
    !process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ||
    typeof window === "undefined"
  ) return;

  if (window.__techgotganAmplitudeReady) {
    void import("@amplitude/analytics-browser")
      .then((amplitude) => amplitude.track(eventType, properties))
      .catch(() => {});
    return;
  }

  const queue = window.__techgotganAmplitudeQueue ?? [];
  if (queue.length < MAX_QUEUED_EVENTS) queue.push({ eventType, properties });
  window.__techgotganAmplitudeQueue = queue;
}

export function markAmplitudeReadyAndDrainQueue(): QueuedAnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  window.__techgotganAmplitudeReady = true;
  const queued = window.__techgotganAmplitudeQueue ?? [];
  window.__techgotganAmplitudeQueue = [];
  return queued;
}
