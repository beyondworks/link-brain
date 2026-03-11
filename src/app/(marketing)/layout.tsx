'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, Twitter, Github, ArrowRight } from 'lucide-react';
import { LinkbrainLogo } from '@/components/brand/linkbrain-logo';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-glass-heavy border-b border-border/60 shadow-[0_1px_40px_oklch(0_0_0/8%)]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="container mx-auto flex h-18 items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center transition-opacity duration-200 hover:opacity-90"
          >
            <LinkbrainLogo variant="full" height={24} />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {[
              { href: '/features', label: '기능' },
              { href: '/pricing', label: '요금제' },
              { href: '/explore', label: '탐색' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="relative rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/60 after:absolute after:inset-x-4 after:bottom-1 after:h-[2px] after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" size="sm" asChild className="text-sm font-medium">
              <Link href="/login">로그인</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="animate-pulse-brand shadow-brand hover:shadow-brand-lg rounded-lg px-5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5"
            >
              <Link href="/signup" className="flex items-center gap-1.5">
                무료로 시작하기 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            className="rounded-lg p-2 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="메뉴 열기"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-border/50 bg-glass-heavy px-6 pb-5 pt-3 md:hidden">
            <nav className="flex flex-col gap-0.5">
              {[
                { href: '/features', label: '기능' },
                { href: '/pricing', label: '요금제' },
                { href: '/explore', label: '탐색' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="ghost" size="sm" asChild className="justify-start">
                <Link href="/login">로그인</Link>
              </Button>
              <Button size="sm" asChild className="shadow-brand">
                <Link href="/signup">무료로 시작하기</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Pre-footer CTA banner */}
      <div className="relative overflow-hidden bg-gradient-brand-vibrant">
        <div className="bg-noise absolute inset-0" />
        {/* Glow orbs */}
        <div className="glow-orb animate-float-slow absolute -left-20 -top-10 h-60 w-60 opacity-60" />
        <div className="glow-orb animate-float-reverse absolute -bottom-10 -right-20 h-80 w-80 opacity-40" />
        <div className="container relative z-10 mx-auto px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <p className="text-xl font-bold text-white">지금 바로 시작하세요</p>
              <p className="mt-1 text-sm text-white/70">
                무료 플랜으로 100개 클립까지 영원히 무료 — 카드 등록 불필요
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="shrink-0 bg-white font-semibold text-foreground shadow-[0_4px_24px_oklch(0_0_0/20%)] transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_8px_40px_oklch(0_0_0/30%)]"
            >
              <Link href="/signup" className="flex items-center gap-2">
                무료로 시작하기 <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-border/50 bg-dots py-16">
        <div className="container mx-auto px-6">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            {/* Brand column */}
            <div className="sm:col-span-2 md:col-span-1">
              <Link href="/" className="group inline-flex items-center">
                <LinkbrainLogo variant="full" height={20} />
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                웹의 모든 콘텐츠를 저장하고,
                <br />
                AI로 정리하고, 지식으로 연결하세요.
              </p>
              <div className="mt-5 flex items-center gap-2">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/icon flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-brand-muted hover:text-primary"
                  aria-label="Twitter"
                >
                  <Twitter className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/icon flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-brand-muted hover:text-primary"
                  aria-label="GitHub"
                >
                  <Github className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-foreground/50">
                제품
              </h3>
              <ul className="space-y-3 text-sm">
                {[
                  { href: '/features', label: '기능' },
                  { href: '/pricing', label: '요금제' },
                  { href: '/explore', label: '탐색' },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-foreground/50">
                리소스
              </h3>
              <ul className="space-y-3 text-sm">
                {[
                  { href: '/docs', label: '문서' },
                  { href: '/changelog', label: '변경 내역' },
                  { href: '/blog', label: '블로그' },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-foreground/50">
                법적 고지
              </h3>
              <ul className="space-y-3 text-sm">
                {[
                  { href: '/privacy', label: '개인정보처리방침' },
                  { href: '/terms', label: '이용약관' },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="divider-gradient mt-12" />

          <div className="mt-6 text-center text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Linkbrain. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
