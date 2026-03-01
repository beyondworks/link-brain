import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Linkbrain - 당신의 세컨드 브레인',
  description:
    '웹의 모든 콘텐츠를 저장하고, AI로 정리하고, 지식으로 연결하세요.',
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Marketing Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Linkbrain
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              기능
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              요금제
            </Link>
            <Link
              href="/explore"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              탐색
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">로그인</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">무료로 시작하기</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <h3 className="mb-3 text-sm font-semibold">제품</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground">기능</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground">요금제</Link></li>
                <li><Link href="/explore" className="hover:text-foreground">탐색</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold">리소스</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/docs" className="hover:text-foreground">문서</Link></li>
                <li><Link href="/changelog" className="hover:text-foreground">변경 내역</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold">법적 고지</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">개인정보처리방침</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">이용약관</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold">Linkbrain</h3>
              <p className="text-sm text-muted-foreground">
                웹의 모든 콘텐츠를 저장하고, AI로 정리하세요.
              </p>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Linkbrain. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
