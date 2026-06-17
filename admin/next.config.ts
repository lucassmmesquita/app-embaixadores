import type { NextConfig } from "next";

const isExport = process.env.NEXT_OUTPUT_MODE === "export";

const nextConfig: NextConfig = {
  // 'export' for Render (static HTML), 'standalone' for Docker
  output: isExport ? "export" : "standalone",
  // Base path for deployment behind /admin on Render
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  // Admin panel dev server port
  devIndicators: false,
  // API proxy to backend (avoid CORS in development) — not supported with export
  ...(!isExport && {
    async rewrites() {
      return [
        {
          source: "/api/:path*",
          destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*`,
        },
      ];
    },
  }),
};

export default nextConfig;
