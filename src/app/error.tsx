"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] px-4 text-center">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "var(--color-brand-muted)" }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
        문제가 발생했습니다
      </h1>
      <p className="mt-2 text-sm text-[var(--color-foreground-muted)] max-w-sm">
        예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
      </p>

      {error.digest && (
        <p className="mt-2 text-xs text-[var(--color-foreground-muted)] font-mono">
          오류 코드: {error.digest}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
          style={{ backgroundColor: "var(--color-brand)" }}
        >
          다시 시도
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-raised)]"
        >
          홈으로 이동
        </a>
      </div>
    </div>
  );
}
