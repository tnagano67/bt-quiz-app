import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["date-fns", "date-fns-tz", "chart.js", "react-chartjs-2"],
  },
};

export default nextConfig;
