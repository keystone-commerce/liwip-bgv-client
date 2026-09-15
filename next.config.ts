import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true
};

export default nextConfig;
