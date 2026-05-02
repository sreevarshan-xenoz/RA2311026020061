import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/evaluation-service/:path*",
        destination: "http://20.207.122.201/evaluation-service/:path*",
      },
    ];
  },
};

export default nextConfig;
