'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSupabase } from '@/components/providers/supabase-provider';
import { LinkbrainLogo } from '@/components/brand/linkbrain-logo';

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useSupabase();

  return (
    <div className="min-h-screen">
      {/* Explore Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center">
            <LinkbrainLogo variant="full" height={20} />
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/explore"
              className="text-sm font-medium text-foreground"
            >
              탐색
            </Link>
            {user ? (
              <Button size="sm" variant="ghost" asChild>
                <Link href="/dashboard">대시보드</Link>
              </Button>
            ) : (
              <Button size="sm" variant="ghost" asChild>
                <Link href="/login">로그인</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
