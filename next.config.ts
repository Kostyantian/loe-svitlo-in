import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Правильна генерація статичних файлів для Vercel
  transpilePackages: [],
};

export default nextConfig;
