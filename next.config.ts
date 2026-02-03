import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do NOT use output: 'export' — we need SSR for DB
  
  images: {
    unoptimized: true,
  },
  
  // Server Actions work on Edge with Turso
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
