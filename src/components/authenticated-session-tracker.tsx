"use client";

import { useEffect } from "react";
import { trackAuthenticatedSessionStarted, type AuthMethod } from "@/lib/analytics";

const SESSION_STORAGE_KEY = "techgotgan-authenticated-session-started";
const SESSION_WINDOW_MS = 30 * 60 * 1000;
let trackedInCurrentDocument = false;

export function AuthenticatedSessionTracker({ authMethod }: { authMethod: AuthMethod }) {
  useEffect(() => {
    if (
      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" ||
      !process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY
    ) return;

    if (trackedInCurrentDocument) return;

    const now = Date.now();
    try {
      const previous = Number(window.sessionStorage.getItem(SESSION_STORAGE_KEY));
      if (Number.isFinite(previous) && previous <= now && now - previous < SESSION_WINDOW_MS) {
        trackedInCurrentDocument = true;
        return;
      }
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, String(now));
    } catch {
      // Tracking remains available in browsers where sessionStorage is restricted.
    }

    trackedInCurrentDocument = true;
    trackAuthenticatedSessionStarted(authMethod);
  }, [authMethod]);

  return null;
}
