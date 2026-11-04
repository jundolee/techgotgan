"use client";

const STORAGE_KEY = "techgotgan-acquisition-context";
const SESSION_WINDOW_MS = 30 * 60 * 1000;
const SAFE_VALUE = /^[a-z0-9][a-z0-9._-]{0,79}$/i;
const ATTRIBUTION_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "referrer_host"] as const;

export type AcquisitionContext = Partial<Record<(typeof ATTRIBUTION_FIELDS)[number], string>>;

/** Read the first-touch channel captured before hydration for this analytics session. */
export function getAcquisitionContext(): AcquisitionContext {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const saved = JSON.parse(raw) as Record<string, unknown>;
    const capturedAt = saved.captured_at;
    if (
      typeof capturedAt !== "number" ||
      capturedAt > Date.now() ||
      Date.now() - capturedAt > SESSION_WINDOW_MS
    ) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return {};
    }

    const context: AcquisitionContext = {};
    for (const field of ATTRIBUTION_FIELDS) {
      const value = saved[field];
      if (typeof value === "string" && SAFE_VALUE.test(value)) context[field] = value;
    }
    if (Object.keys(context).length > 0) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ captured_at: Date.now(), ...context }));
    }
    return context;
  } catch {
    try { window.sessionStorage.removeItem(STORAGE_KEY); } catch {}
    return {};
  }
}
