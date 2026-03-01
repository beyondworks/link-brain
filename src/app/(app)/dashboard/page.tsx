import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
          저장된 클립과 최근 활동을 확인하세요.
        </p>
      </div>
    </div>
  );
}
