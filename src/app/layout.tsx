import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { SupabaseProvider } from '@/components/providers/supabase-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SwRegister } from '@/components/pwa/sw-register';
import { ThemeColorSync } from '@/components/layout/theme-color-sync';
import { ThemeColorScript } from '@/components/layout/theme-color-script';
import { NativeProvider } from '@/components/native/native-provider';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Linkbrain — AI-powered Bookmark Manager',
    template: '%s | Linkbrain',
  },
  description: 'Save anything from the web, let AI organize it, and turn your bookmarks into a second brain. Supports YouTube, Twitter, blogs, and more.',
  keywords: ['AI', '세컨드 브레인', '북마크', '지식 관리', '링크', 'second brain', 'knowledge management', 'bookmark manager', 'AI bookmark'],
  authors: [{ name: 'Linkbrain' }],
  creator: 'Linkbrain',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://linkbrain.cloud'
  ),
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Linkbrain',
    title: 'Linkbrain — AI-powered Bookmark Manager',
    description: 'Save anything from the web, let AI organize it, and turn your bookmarks into a second brain.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@linkbrain_app',
    title: 'Linkbrain — AI-powered Bookmark Manager',
    description: 'Save anything from the web, let AI organize it, and turn your bookmarks into a second brain.',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://linkbrain.cloud',
  },
  icons: {
    icon: '/icons/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'Linkbrain',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#2e2e2e' },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${inter.variable} bg-background`}
    >
      <body className="bg-background font-[family-name:var(--font-pretendard),var(--font-inter),sans-serif] antialiased">
        {/* Status bar cover layer — physically covers the iOS safe area with app background.
            z-[9999] ensures it sits above ALL overlays (Radix Portals, Sheet backdrops, sidebar overlay).
            This prevents any dark overlay from bleeding into the status bar area. */}
        <div
          aria-hidden="true"
          className="fixed top-0 left-0 right-0 z-[9999] bg-background pointer-events-none"
          style={{ height: 'env(safe-area-inset-top, 0px)' }}
        />
        {/* Bottom safe area is handled by sidebar paddingBottom — no separate cover div needed. */}
        <ThemeColorScript />
        {/* Pretendard from CDN - preconnect for performance */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <SwRegister />
        <NativeProvider>
          <QueryProvider>
            <SupabaseProvider>
              <ThemeProvider>
                <ThemeColorSync />
                <TooltipProvider delayDuration={300}>
                  {children}
                  <MobileBottomNav />
                  <Toaster position="bottom-right" richColors />
                </TooltipProvider>
              </ThemeProvider>
            </SupabaseProvider>
          </QueryProvider>
        </NativeProvider>
      </body>
    </html>
  );
}
