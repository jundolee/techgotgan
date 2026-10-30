"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function afterStableLcp(callback: () => void): () => void {
  const browserWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  let cancelled = false;
  let started = false;
  let stableTimer: number | undefined;
  let fallbackTimer: number | undefined;
  let idleTimer: number | undefined;
  let idleCallbackId: number | undefined;
  let observer: PerformanceObserver | undefined;

  const runWhenIdle = () => {
    if (cancelled || started) return;
    started = true;
    observer?.disconnect();
    if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);

    if (browserWindow.requestIdleCallback) {
      idleCallbackId = browserWindow.requestIdleCallback(() => {
        if (!cancelled) callback();
      }, { timeout: 2_000 });
    } else {
      idleTimer = window.setTimeout(() => {
        if (!cancelled) callback();
      }, 500);
    }
  };

  const waitForStableLcp = () => {
    if (started || cancelled) return;
    if (stableTimer !== undefined) window.clearTimeout(stableTimer);
    stableTimer = window.setTimeout(runWhenIdle, 1_500);
  };

  if (
    typeof PerformanceObserver !== "undefined" &&
    PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")
  ) {
    observer = new PerformanceObserver((entries) => {
      if (entries.getEntries().length > 0) waitForStableLcp();
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });

    if (performance.getEntriesByType("largest-contentful-paint").length > 0) {
      waitForStableLcp();
    }
    fallbackTimer = window.setTimeout(() => {
      if (stableTimer === undefined) runWhenIdle();
    }, 15_000);
  } else {
    fallbackTimer = window.setTimeout(runWhenIdle, 5_000);
  }

  return () => {
    cancelled = true;
    observer?.disconnect();
    if (stableTimer !== undefined) window.clearTimeout(stableTimer);
    if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    if (idleTimer !== undefined) window.clearTimeout(idleTimer);
    if (idleCallbackId !== undefined) browserWindow.cancelIdleCallback?.(idleCallbackId);
  };
}

/**
 * Analytics is initialized after the first view has painted so the SDK's client bundle does not
 * compete with the onboarding image and initial feed for mobile CPU time.
 */
export function AmplitudeAnalytics() {
  const pathname = usePathname();
  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!analyticsEnabled || !apiKey) return;

    let cancelled = false;
    const cleanup = afterStableLcp(() => {
      void import("@amplitude/analytics-browser")
        .then((amplitude) => {
          if (cancelled) return;
          // Autocapture is disabled because it would collect ?q= search text.
          amplitude.init(apiKey, {
            autocapture: false,
            remoteConfig: { fetchRemoteConfig: false },
            trackingOptions: { ipAddress: false, language: false, platform: false },
          });
          setInitialized(true);
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [analyticsEnabled, apiKey]);

  useEffect(() => {
    if (!initialized || !pathname) return;
    void import("@amplitude/analytics-browser")
      .then((amplitude) => amplitude.track("page_viewed", { page_path: pathname }))
      .catch(() => {});
  }, [initialized, pathname]);

  return null;
}
