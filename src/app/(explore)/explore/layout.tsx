import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Explore Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Linkbrain
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/explore"
              className="text-sm font-medium text-foreground"
            >
              탐색
            </Link>
            <Button size="sm" variant="ghost" asChild>
              <Link href="/login">로그인</Link>
            </Button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
