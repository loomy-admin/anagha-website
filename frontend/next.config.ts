import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4001";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.38'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/upload/:path*",
        destination: `${BACKEND_URL}/api/upload/:path*`,
      },
      {
        source: "/api/site/:path*",
        destination: `${BACKEND_URL}/api/site/:path*`,
      },
      {
        source: "/api/catalog",
        destination: `${BACKEND_URL}/api/catalog`,
      },
      {
        source: "/api/catalog/:path*",
        destination: `${BACKEND_URL}/api/catalog/:path*`,
      },
      {
        source: "/api/checkout",
        destination: `${BACKEND_URL}/api/checkout`,
      },
      {
        source: "/api/checkout/:path*",
        destination: `${BACKEND_URL}/api/checkout/:path*`,
      },
      {
        source: "/api/auth",
        destination: `${BACKEND_URL}/api/auth`,
      },
      {
        source: "/api/auth/:path*",
        destination: `${BACKEND_URL}/api/auth/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
