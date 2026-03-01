import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

// Primary font: Inter (Google Fonts, always available)
// To add Pretendard Variable:
//   1. Download PretendardVariable.woff2 from https://github.com/orioncactus/pretendard/releases
//   2. Place at /public/fonts/PretendardVariable.woff2
//   3. Uncomment the localFont block below and add pretendard.variable to <html>
//
// import localFont from "next/font/local";
// const pretendard = localFont({
//   src: "../../public/fonts/PretendardVariable.woff2",
//   variable: "--font-pretendard",
//   weight: "45 920",
//   display: "swap",
//   preload: true,
//   fallback: ["Pretendard", "Apple SD Gothic Neo", "sans-serif"],
// });

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
      <body className="font-[family-name:var(--font-inter),sans-serif] antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
