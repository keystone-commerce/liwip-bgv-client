import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  // Hide the floating Next.js "N" badge in dev; it covers the onboarding footer on
  // phones. Build and runtime errors still open the error overlay.
  devIndicators: false,
  // The permanent dev tunnel (an EC2 relay, see AGENTS.md) serves `pnpm dev` here,
  // so live reload has to accept it as an origin.
  allowedDevOrigins: ["dev-bgv.liwip.com"],
  async redirects() {
    // The onboarding was briefly served at /onboarding before it became the landing.
    return [{ source: "/onboarding", destination: "/", permanent: false }];
  }
};

export default nextConfig;
