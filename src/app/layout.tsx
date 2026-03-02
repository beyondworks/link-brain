import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { SupabaseProvider } from '@/components/providers/supabase-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Linkbrain',
    template: '%s — Linkbrain',
  },
  description: 'AI 세컨드 브레인 — 웹 콘텐츠 저장 & 지식 관리',
  keywords: ['AI', '세컨드 브레인', '북마크', '지식 관리', '링크', 'second brain', 'knowledge management'],
  authors: [{ name: 'Linkbrain' }],
  creator: 'Linkbrain',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://linkbrain.cloud'
  ),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Linkbrain',
    title: 'Linkbrain',
    description: 'AI 세컨드 브레인 — 웹 콘텐츠 저장 & 지식 관리',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Linkbrain',
    description: 'AI 세컨드 브레인 — 웹 콘텐츠 저장 & 지식 관리',
  },
  icons: {
    icon: '/icons/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: "#21DBA4",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={inter.variable}
    >
      <body className="font-[family-name:var(--font-pretendard),var(--font-inter),sans-serif] antialiased">
        {/* Pretendard from CDN - preconnect for performance */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <QueryProvider>
          <SupabaseProvider>
            <ThemeProvider>
              <TooltipProvider delayDuration={300}>
                {children}
                <Toaster position="bottom-right" richColors />
              </TooltipProvider>
            </ThemeProvider>
          </SupabaseProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
