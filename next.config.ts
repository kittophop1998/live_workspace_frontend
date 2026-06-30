import type { NextConfig } from "next";

const apiUrl = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080")
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  // Hosts (besides localhost) allowed to hit the dev server's internal assets.
  allowedDevOrigins: ["100.89.47.118"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
