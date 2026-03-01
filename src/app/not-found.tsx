import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - 페이지를 찾을 수 없습니다",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] px-4 text-center">
      <p className="text-6xl font-bold text-[var(--color-brand)]">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-[var(--color-foreground)]">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-2 text-sm text-[var(--color-foreground-muted)] max-w-sm">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        style={{ backgroundColor: "var(--color-brand)" }}
      >
        대시보드로 돌아가기
      </Link>
    </div>
  );
}
