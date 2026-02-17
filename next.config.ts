import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["date-fns", "date-fns-tz"],
  },
};

export default nextConfig;
