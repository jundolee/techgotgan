import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/admin/summary-preview-image": ["./private-assets/onboarding/step2-ai-summary.png"],
  },
};

export default nextConfig;
