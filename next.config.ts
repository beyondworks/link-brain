import path from 'path';
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ['jsdom'],
  outputFileTracingRoot: path.resolve(__dirname),
  output: process.env.CAPACITOR_BUILD ? 'export' : undefined,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    unoptimized: !!process.env.CAPACITOR_BUILD,
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: '*.cdninstagram.com' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: '*.redd.it' },
      { protocol: 'https', hostname: 'miro.medium.com' },
      { protocol: 'https', hostname: 'i.pinimg.com' },
      { protocol: 'https', hostname: 'opengraph.githubassets.com' },
      { protocol: 'https', hostname: 'media.licdn.com' },
      { protocol: 'https', hostname: '*.pstatic.net' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'montage.wanted.co.kr' },
      { protocol: 'https', hostname: 'social.news.hada.io' },
      { protocol: 'https', hostname: '*.giphy.com' },
    ],
  },
  trailingSlash: !!process.env.CAPACITOR_BUILD,
};

export default nextConfig;
