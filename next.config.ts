import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  async redirects() {
    // The onboarding was briefly served at /onboarding before it became the landing.
    return [{ source: "/onboarding", destination: "/", permanent: false }];
  }
};

export default nextConfig;
