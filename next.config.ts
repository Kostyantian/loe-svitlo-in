import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Правильна генерація статичних файлів для Vercel
  transpilePackages: [],

  // Дозволяємо Service Worker
  async rewrites() {
    return [
      {
        source: '/sw.js',
        destination: '/sw.js',
      },
    ];
  },

  // Заголовки для запобігання кешуванню
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
