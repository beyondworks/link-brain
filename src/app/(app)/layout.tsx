"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden"
          style={{ zIndex: "var(--z-overlay)" }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 w-64 flex-shrink-0",
          "bg-[var(--color-surface)] border-r border-[var(--color-border)]",
          "flex flex-col transition-transform duration-200 ease-in-out",
          "lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{ zIndex: "var(--z-sticky)" }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--color-border)]">
          <span className="text-lg font-semibold text-[var(--color-foreground)]">
            Link<span className="text-[var(--color-brand)]">Brain</span>
          </span>
          <button
            type="button"
            className="lg:hidden p-1 rounded-md text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
            onClick={() => setSidebarOpen(false)}
            aria-label="사이드바 닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sidebar nav placeholder */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {/* Navigation items will be added by Sidebar component */}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center h-14 px-4 border-b border-[var(--color-border)] bg-[var(--color-background)] lg:hidden">
          <button
            type="button"
            className="p-1 rounded-md text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
            onClick={() => setSidebarOpen(true)}
            aria-label="사이드바 열기"
          >
            <Menu size={20} />
          </button>
          <span className="ml-3 text-base font-semibold text-[var(--color-foreground)]">
            Link<span className="text-[var(--color-brand)]">Brain</span>
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
