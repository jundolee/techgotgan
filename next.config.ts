import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/admin/summary-preview-image": ["./private-assets/onboarding/step2-ai-summary.png"],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "techgotgan.vercel.app" }],
        destination: "https://www.techgotgan.co.kr/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
