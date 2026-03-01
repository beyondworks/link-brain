import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.CAPACITOR_BUILD ? 'export' : undefined,
  images: {
    unoptimized: !!process.env.CAPACITOR_BUILD,
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
  },
  trailingSlash: !!process.env.CAPACITOR_BUILD,
};

export default nextConfig;
