'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
// Social icons removed until real accounts are set up
import { LinkbrainLogo } from '@/components/brand/linkbrain-logo';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="w-full min-h-screen bg-white overflow-x-hidden">
      {/* ── Navbar (Figma) ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-black/5 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1320px] mx-auto px-6 md:px-12 h-[84px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <LinkbrainLogo variant="full" height={24} />
          </Link>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-[14px] text-[#555] hover:text-[#222] transition-colors duration-200 px-4 py-2"
              style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 400 }}
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="relative text-[14px] text-white px-5 py-2 rounded-full overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-[#21DBA4]/30"
              style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 500 }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[#21DBA4] to-[#5DD5C3] transition-all duration-300 group-hover:opacity-90" />
              <span className="relative">무료로 시작하기</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col gap-[5px] w-6 h-5 justify-center"
          >
            <span className={`block h-[1.5px] bg-[#21DBA4] transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
            <span className={`block h-[1.5px] bg-[#21DBA4] transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-[1.5px] bg-[#21DBA4] transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden overflow-hidden bg-white/95 backdrop-blur-xl border-t border-black/5">
            <div className="px-6 py-4 flex flex-col gap-4">
              <Link
                href="/signup"
                className="text-center text-[14px] text-white px-5 py-2.5 rounded-full bg-gradient-to-r from-[#21DBA4] to-[#5DD5C3] mt-2"
                style={{ fontFamily: "'Pretendard Variable', sans-serif", fontWeight: 500 }}
                onClick={() => setMobileOpen(false)}
              >
                무료로 시작하기
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for fixed nav */}
      <div className="h-[84px]" />

      {/* Content */}
      <main>{children}</main>

      {/* ── Download Banner (Figma) ── */}
      <div className="border-b border-[#f5f5f5]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-8 flex items-center justify-between flex-wrap gap-4">
          <p
            className="text-transparent bg-clip-text tracking-[-0.3px] text-[24px]"
            style={{
              backgroundImage: 'linear-gradient(120deg, #5DD5C3 0%, #9BDDF3 50%, #5DD5C3 100%)',
              fontFamily: "'Inter', 'Pretendard Variable', sans-serif",
              fontWeight: 600,
            }}
          >
            Download Linkbrain for Mac OS / Windows
          </p>
          <Link
            href="/signup"
            className="px-6 py-2 rounded-full text-[14px] text-white transition-shadow hover:shadow-lg hover:shadow-[#21DBA4]/20"
            style={{
              background: 'linear-gradient(100deg, #C3EBF8 0%, #21DBA4 77%)',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
            }}
          >
            시작하기
          </Link>
        </div>
      </div>

      {/* ── Footer (Figma) ── */}
      <footer className="bg-white border-t border-[#f0f0f0]">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
            {/* Brand */}
            <div className="md:col-span-2 space-y-5">
              <Link href="/" className="inline-flex items-center">
                <LinkbrainLogo variant="full" height={20} />
              </Link>
              <p
                className="text-[14px] text-[#999] leading-[1.7] tracking-[-0.2px] max-w-[260px]"
                style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
              >
                저장한 링크가 나만의 지식이 되는 세컨드 브레인 플랫폼.
              </p>
              {/* Social links hidden until real accounts are set up */}
            </div>

            {/* 링크 */}
            <div className="space-y-4">
              <ul className="space-y-3">
                {[
                  { label: '문의하기', href: 'mailto:beyondworks.br@gmail.com' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-[14px] text-[#666] hover:text-[#222] transition-colors duration-200 tracking-[-0.2px]"
                      style={{ fontFamily: "'Pretendard Variable', sans-serif" }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-16 pt-6 border-t border-[#f5f5f5] flex items-center justify-between flex-wrap gap-3">
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
