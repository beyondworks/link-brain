import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "로그인 | LinkBrain",
    template: "%s | LinkBrain",
  },
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - animated brand visual */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden bg-gradient-animated">

        {/* Noise texture overlay */}
        <div className="absolute inset-0 bg-noise pointer-events-none z-[1]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}

        {/* Glow orbs */}
        <div
          className="glow-orb animate-float w-96 h-96 -top-24 -left-24"
          style={{ background: "oklch(0.90 0.14 168 / 30%)" }}
        />
        <div
          className="glow-orb animate-float-slow w-80 h-80 bottom-0 right-0 translate-x-1/3 translate-y-1/3"
          style={{ background: "oklch(0.70 0.12 200 / 25%)" }}
        />
        <div
          className="glow-orb animate-float-reverse w-64 h-64 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ background: "oklch(0.65 0.18 155 / 20%)" }}
        />

        {/* Floating geometric shapes */}
        <div
          className="absolute top-16 right-16 w-12 h-12 rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm animate-float"
          style={{ animationDelay: "0ms" }}
          aria-hidden="true"
        />
        <div
          className="absolute top-1/3 right-8 w-8 h-8 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm animate-float-reverse"
          style={{ animationDelay: "1200ms" }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-32 left-12 w-16 h-16 rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm animate-float-slow"
          style={{ animationDelay: "600ms" }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-16 right-24 w-10 h-10"
          style={{ animationDelay: "900ms" }}
          aria-hidden="true"
        >
          {/* Triangle shape */}
          <svg viewBox="0 0 40 40" className="w-full h-full animate-orbit opacity-30">
            <polygon points="20,4 36,34 4,34" fill="none" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>
        <div
          className="absolute top-1/4 left-8 w-6 h-6 rounded border border-white/30 bg-white/5 animate-spin-slow"
          aria-hidden="true"
        />

        {/* Brand content */}
        <div className="relative z-10 flex flex-col items-center text-center gap-10">
          {/* Logo */}
          <div className="flex flex-col items-center gap-6 animate-fade-in-up">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-symbol.svg" alt="" width={80} height={45} className="drop-shadow-lg" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-typo.svg" alt="Linkbrain" width={160} height={34} className="drop-shadow-md" />
          </div>

          {/* Tagline */}
          <div className="flex flex-col gap-2 animate-fade-in-up animation-delay-200">
            <p className="text-2xl font-bold text-white leading-snug">
              웹의 모든 지식을<br />연결하세요
            </p>
            <p className="text-sm text-white/80 max-w-xs leading-relaxed">
              북마크를 저장하고, AI로 분류하고,<br />필요할 때 바로 찾아보세요.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="flex flex-col gap-3 w-full max-w-xs animate-fade-in-up animation-delay-400">
            {[
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2L2 7l10 5 10-5-10-5Z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                ),
                title: "AI 자동 분류",
                desc: "저장한 링크를 AI가 자동으로 태그하고 정리합니다",
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                ),
                title: "스마트 검색",
                desc: "내용 기반으로 원하는 링크를 빠르게 찾아보세요",
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
                title: "컬렉션 공유",
                desc: "팀과 함께 지식을 수집하고 공유할 수 있습니다",
              },
            ].map(({ icon, title, desc }, i) => (
              <div
                key={title}
                className="flex items-start gap-3 text-left rounded-xl p-3 bg-white/10 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:bg-white/15 group"
                style={{ animationDelay: `${500 + i * 100}ms` }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 text-white icon-glow group-hover:bg-white/30 transition-colors duration-300">
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-white/80 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - auth card */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background px-4 py-12">
        {/* Mobile logo */}
        <div className="md:hidden mb-8 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.svg" alt="Linkbrain" width={126} height={22} />
        </div>

        {/* Auth card */}
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm animate-blur-in card-inner-glow">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} LinkBrain. All rights reserved.
        </p>
      </div>
    </div>
  );
}
