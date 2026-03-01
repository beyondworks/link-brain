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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] px-4">
      {/* Brand logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "var(--color-brand)" }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <span className="text-xl font-bold text-[var(--color-foreground)]">
          Link<span style={{ color: "var(--color-brand)" }}>Brain</span>
        </span>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-sm">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-[var(--color-foreground-muted)]">
        &copy; {new Date().getFullYear()} LinkBrain. All rights reserved.
      </p>
    </div>
  );
}
