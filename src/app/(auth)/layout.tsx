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
    <div className="min-h-screen flex" style={{ fontFamily: "'Pretendard Variable', sans-serif" }}>
      {/* Left panel - light gradient brand visual */}
      <div
        className="hidden md:flex md:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #e6f3f8 0%, #edf7fb 20%, #f4fafc 55%, #ffffff 100%)",
        }}
      >
        {/* Subtle teal orbs */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 420,
            height: 420,
            top: -80,
            left: -80,
            background: "radial-gradient(circle, rgba(33,219,164,0.12) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 320,
            height: 320,
            bottom: -60,
            right: -60,
            background: "radial-gradient(circle, rgba(93,213,195,0.10) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        {/* Brand content */}
        <div className="relative z-10 flex flex-col items-center text-center gap-10">
          {/* Logo */}
          <div className="flex flex-col items-center gap-5 animate-fade-in-up">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/linkbrain-symbol.svg" alt="" width={72} height={40} aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/linkbrain-typo.svg" alt="Linkbrain" width={160} height={29} />
          </div>

          {/* Tagline */}
          <div className="flex flex-col gap-2 animate-fade-in-up animation-delay-200">
            <p className="text-2xl font-bold leading-snug" style={{ color: "#1a2e2a" }}>
              웹의 모든 지식을<br />연결하세요
            </p>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: "#5a7a72" }}>
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
                className="flex items-start gap-3 text-left rounded-2xl p-3 transition-all duration-300 group"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(33,219,164,0.15)",
                  animationDelay: `${500 + i * 100}ms`,
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300"
                  style={{ background: "rgba(33,219,164,0.12)", color: "#21DBA4" }}
                >
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#1a2e2a" }}>{title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#5a7a72" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - white auth card */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-4 py-12">
        {/* Mobile logo */}
        <div className="md:hidden mb-8 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/linkbrain-logo.svg" alt="Linkbrain" width={120} height={20} />
        </div>

        {/* Auth card */}
        <div
          className="w-full max-w-md rounded-2xl p-8 animate-blur-in"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.07)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-xs" style={{ color: "#9aada9" }}>
          &copy; {new Date().getFullYear()} LinkBrain. All rights reserved.
        </p>
      </div>
    </div>
  );
}
