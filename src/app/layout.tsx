import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { AmplitudeAnalytics } from "@/components/amplitude-analytics";
import { DeferredGoogleTagManager } from "@/components/deferred-google-tag-manager";
import { PageFooter } from "@/components/page-footer";
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "./seo";
import "@seed-design/css/base.css";
import "@seed-design/css/recipes/text.css";
import "@seed-design/css/recipes/badge.css";
import "@seed-design/css/recipes/aspect-ratio.css";
import "@seed-design/css/recipes/tabs.css";
import "@seed-design/css/recipes/action-button.css";
import "@seed-design/css/recipes/text-input.css";
import "@seed-design/css/recipes/field-label.css";
import "@seed-design/css/recipes/progress-circle.css";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const GTM_CONTAINER_ID = "GTM-P2HHB9CG";
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";

const freesentation = localFont({
  variable: "--font-freesentation",
  display: "swap",
  src: [
    { path: "./fonts/freesentation/Freesentation-4Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/freesentation/Freesentation-5Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/freesentation/Freesentation-6SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/freesentation/Freesentation-7Bold.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
    keywords: ["테크 블로그", "기술 블로그", "테크 글", "개발 글", "AI 기술 글"],
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": `${SITE_URL}/feed.xml` },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, alt: SITE_NAME }],
  },
  ...(GOOGLE_SITE_VERIFICATION ? { verification: { google: GOOGLE_SITE_VERIFICATION } } : {}),
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "ko-KR",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: DEFAULT_OG_IMAGE,
    },
  ],
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-seed-color-mode="light" className={freesentation.variable}>
      {ANALYTICS_ENABLED && (
        <Script id="gtm-init" strategy="beforeInteractive">
          {`(function(w,l){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});})(window,'dataLayer');`}
        </Script>
      )}
      {ANALYTICS_ENABLED && <AmplitudeAnalytics />}
      <body>
        <Script id="article-view-preference" strategy="beforeInteractive">
          {`try {
            const key = "techgotgan-article-view";
            const match = document.cookie.match(new RegExp("(?:^|; )" + key + "=(list|card)(?:;|$)"));
            let storedView = null;
            try { storedView = localStorage.getItem(key); } catch {}
            const view = storedView === "list" || storedView === "card" ? storedView : match?.[1];
            if (view === "list" || view === "card") {
              document.documentElement.dataset.articleView = view;
              try { localStorage.setItem(key, view); } catch {}
              if (match?.[1] !== view) {
                document.cookie = key + "=" + view + "; max-age=31536000; path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
              }
            }
          } catch {}
          `}
        </Script>
        <Script id="article-navigation-bridge" strategy="beforeInteractive">
          {`(() => {
            document.addEventListener("click", (event) => {
              if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              const target = event.target;
              if (!(target instanceof Element)) return;
              const anchor = target.closest('a[data-article-link="true"]');
              if (!anchor || anchor.getAttribute("data-article-hydrated") === "true") return;
              const url = new URL(anchor.href, window.location.href);
              if (url.origin !== window.location.origin || !/^\\/articles\\/[0-9a-f-]+$/i.test(url.pathname)) return;
              event.preventDefault();
              window.__techgotganPendingArticlePath = url.pathname;
            }, true);
          })();`}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
        />
        {ANALYTICS_ENABLED && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
              height={0}
              width={0}
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        {ANALYTICS_ENABLED && <DeferredGoogleTagManager gtmId={GTM_CONTAINER_ID} />}
        <div className="app-shell">
          {children}
          <PageFooter />
        </div>
        {modal}
      </body>
    </html>
  );
}
