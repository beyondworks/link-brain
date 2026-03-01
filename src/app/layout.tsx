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
    default: "LinkBrain - AI Second Brain",
    template: "%s | LinkBrain",
  },
  description:
    "AI-powered second brain for saving, organizing, and discovering knowledge from links, articles, and the web.",
  keywords: ["AI", "second brain", "bookmarks", "knowledge management", "links"],
  authors: [{ name: "LinkBrain" }],
  creator: "LinkBrain",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://linkbrain.app"
  ),
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "LinkBrain",
    title: "LinkBrain - AI Second Brain",
    description:
      "AI-powered second brain for saving, organizing, and discovering knowledge.",
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkBrain - AI Second Brain",
    description:
      "AI-powered second brain for saving, organizing, and discovering knowledge.",
  },
  icons: {
    icon: "/icons/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
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
