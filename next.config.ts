import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Article thumbnail paths are stable; cache optimized variants for a month to reduce repeat-view transfers.
    minimumCacheTTL: 2_678_400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/thumbnails/**",
      },
      {
        protocol: "https",
        hostname: "cdn-images-1.medium.com",
        port: "",
        pathname: "/max/**",
        search: "",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/api/admin/summary-preview-image": ["./private-assets/onboarding/step2-ai-summary.png"],
  },
};

export default nextConfig;
