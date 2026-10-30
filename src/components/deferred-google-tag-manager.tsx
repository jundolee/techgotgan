"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

export function DeferredGoogleTagManager({ gtmId }: { gtmId: string }) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const browserWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let activated = false;
    let fallbackTimer: number | undefined;
    let idleTimer: number | undefined;
    let idleCallbackId: number | undefined;
    let observer: PerformanceObserver | undefined;

    const loadWhenIdle = () => {
      if (activated) return;
      activated = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);

      if (browserWindow.requestIdleCallback) {
        idleCallbackId = browserWindow.requestIdleCallback(() => setShouldLoad(true), { timeout: 2_000 });
      } else {
        idleTimer = window.setTimeout(() => setShouldLoad(true), 500);
      }
    };

    if (
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")
    ) {
      if (performance.getEntriesByType("largest-contentful-paint").length > 0) {
        loadWhenIdle();
      } else {
        observer = new PerformanceObserver((entries) => {
          if (entries.getEntries().length === 0) return;
          observer?.disconnect();
          loadWhenIdle();
        });
        observer.observe({ type: "largest-contentful-paint", buffered: true });
      }
      fallbackTimer = window.setTimeout(loadWhenIdle, 15_000);
    } else {
      idleTimer = window.setTimeout(() => setShouldLoad(true), 5_000);
    }

    return () => {
      observer?.disconnect();
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      if (idleTimer !== undefined) window.clearTimeout(idleTimer);
      if (idleCallbackId !== undefined && browserWindow.cancelIdleCallback) {
        browserWindow.cancelIdleCallback(idleCallbackId);
      }
    };
  }, []);

  if (!shouldLoad) return null;

  return (
    <Script
      id="gtm"
      src={`https://www.googletagmanager.com/gtm.js?id=${gtmId}`}
      strategy="afterInteractive"
    />
  );
}
