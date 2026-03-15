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

          {/* Desktop Nav — hidden for now */}
          <nav className="hidden" />

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
            <div className="flex flex-col gap-2">
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
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(100deg, #5DD5C3 0%, #21DBA4 50%, #5BC8E8 100%)' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p
              className="text-[22px] text-white tracking-[-0.5px]"
              style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 700 }}
            >
              지금 바로 시작하세요
            </p>
            <p
              className="mt-1 text-[14px] text-white/70"
              style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
            >
              무료 플랜으로 100개 클립까지 영원히 무료 — 카드 등록 불필요
            </p>
          </div>
          <Link
            href="/signup"
            className="shrink-0 flex items-center gap-2 px-7 py-3 rounded-full text-[15px] bg-white text-[#333] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10"
            style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 600 }}
          >
            무료로 시작하기 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-[#f0f0f0]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-16">
            {/* Brand */}
            <div className="space-y-4">
              <Link href="/" className="inline-flex items-center">
                <LinkbrainLogo variant="full" height={20} />
              </Link>
              <p
                className="text-[14px] text-[#999] leading-[1.7] tracking-[-0.2px] max-w-[260px]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                웹의 모든 콘텐츠를 저장하고,
                <br />
                AI로 정리하고, 지식으로 연결하세요.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                  className="text-[#bbb] hover:text-[#666] transition-colors" aria-label="X">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                  className="text-[#bbb] hover:text-[#666] transition-colors" aria-label="GitHub">
                  <Github className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* 제품 */}
            <div>
              <h3
                className="text-[14px] text-[#111] mb-5 tracking-[-0.3px]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 600 }}
              >
                제품
              </h3>
              <ul className="space-y-3.5">
                {[
                  { href: '/features', label: '기능' },
                  { href: '/pricing', label: '요금제' },
                  { href: '/explore', label: '탐색' },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href}
                      className="text-[14px] text-[#666] hover:text-[#222] transition-colors duration-200"
                      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 리소스 */}
            <div>
              <h3
                className="text-[14px] text-[#111] mb-5 tracking-[-0.3px]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 600 }}
              >
                리소스
              </h3>
              <ul className="space-y-3.5">
                {[
                  { href: '#', label: '문서' },
                  { href: '#', label: '변경 내역' },
                  { href: '#', label: '블로그' },
                ].map(({ href, label }) => (
                  <li key={label}>
                    <Link href={href}
                      className="text-[14px] text-[#666] hover:text-[#222] transition-colors duration-200"
                      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 법적 고지 */}
            <div>
              <h3
                className="text-[14px] text-[#111] mb-5 tracking-[-0.3px]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 600 }}
              >
                법적 고지
              </h3>
              <ul className="space-y-3.5">
                {[
                  { href: '#', label: '개인정보처리방침' },
                  { href: '#', label: '이용약관' },
                ].map(({ href, label }) => (
                  <li key={label}>
                    <Link href={href}
                      className="text-[14px] text-[#666] hover:text-[#222] transition-colors duration-200"
                      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-16 pt-6 border-t border-[#f5f5f5] text-center">
            <p
              className="text-[13px] text-[#ccc]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              © {new Date().getFullYear()} Linkbrain. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
