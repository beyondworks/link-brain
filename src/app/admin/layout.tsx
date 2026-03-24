import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { ArrowLeft } from 'lucide-react';
import { AdminMobileNav, AdminSidebarNav } from './_components/admin-nav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      {/* Mobile top nav */}
      <header
        className="sticky top-0 z-30 border-b border-border/50 bg-card lg:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">Admin</span>
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">
              관리자
            </span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <ArrowLeft size={14} />
            앱으로
          </Link>
        </div>
        <AdminMobileNav />
      </header>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 flex-shrink-0 flex-col border-r border-border/50 bg-card lg:flex">
        <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
          <span className="text-sm font-bold text-foreground">Admin</span>
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">
            관리자
          </span>
        </div>

        <AdminSidebarNav />

        <div className="border-t border-border/50 p-3">
          <p className="truncate px-3 text-[11px] text-muted-foreground/60">
            {admin.email}
          </p>
          <Link
            href="/dashboard"
            className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <ArrowLeft size={16} />
            앱으로 돌아가기
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
