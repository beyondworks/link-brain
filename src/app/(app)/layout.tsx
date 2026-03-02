'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, User, Moon, Sun, Plus } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useUIStore } from '@/stores/ui-store';
import { useRealtimeInvalidation } from '@/lib/hooks/use-realtime-invalidation';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { supabase } from '@/lib/supabase/client';
import { MAIN_NAV } from '@/config/navigation';
import { AppHeader } from '@/components/layout/app-header';
import { OmniSearch } from '@/components/layout/omni-search';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { SidebarCategories } from '@/components/layout/sidebar-categories';
import { ClipPeekPanel } from '@/components/clips/clip-peek-panel';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { user, isLoading } = useSupabase();
  const { theme, setTheme } = useTheme();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  // Single Realtime channel for cache invalidation
  useRealtimeInvalidation(user?.id ?? null);

  // Global keyboard shortcuts
  useKeyboardShortcuts();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const displayName =
    user?.user_metadata?.display_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    '';
  const avatarUrl =
    user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-overlay bg-surface-overlay backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-sticky w-64 flex-shrink-0',
          'bg-glass-heavy border-r border-border/50',
          'flex flex-col transition-transform duration-300 ease-in-out',
          'lg:static lg:translate-x-0 lg:animate-slide-in-left',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-5">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground"
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-brand text-[13px] font-black text-white shadow-brand glow-brand-sm animate-breathe">
              L
            </span>
            <span>
              Link<span className="text-gradient-brand">Brain</span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="사이드바 닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {MAIN_NAV.map((section, idx) => (
            <div key={idx} className={idx > 0 ? 'mt-6' : ''}>
              {section.title && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
                  {section.titleKo ?? section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={[
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-spring',
                          isActive
                            ? 'bg-gradient-brand-subtle font-semibold text-primary'
                            : 'font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                        ].join(' ')}
                        onClick={() => setSidebarOpen(false)}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <span className="indicator-slide absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-gradient-brand" />
                        )}
                        <span className={isActive ? 'icon-glow' : ''}>
                          <Icon
                            size={17}
                            className={[
                              'flex-shrink-0 transition-spring',
                              isActive ? 'text-primary' : 'group-hover-bounce',
                            ].join(' ')}
                          />
                        </span>
                        <span>{item.labelKo}</span>
                        {item.badge && (
                          <span className="ml-auto rounded-full bg-gradient-brand px-1.5 py-0.5 text-[10px] font-bold text-white shadow-brand">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Categories */}
          <SidebarCategories />
        </nav>

        {/* Bottom section — user profile */}
        <div className="border-t border-border/50 p-3">
          {/* User profile */}
          <div className="mt-1">
            {isLoading ? (
              <div className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2.5 w-14" />
                </div>
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-spring hover:bg-accent/60 hover:glow-brand-sm"
                  >
                    <Avatar className="h-9 w-9 ring-2 ring-primary/30 transition-spring group-hover:ring-primary/60">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="bg-gradient-brand text-[11px] font-bold text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col items-start">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold text-foreground">
                          {displayName}
                        </span>
                        <span className="flex-shrink-0 rounded-full bg-gradient-brand px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white shadow-brand">
                          Pro
                        </span>
                      </div>
                      <span className="truncate text-[11px] text-muted-foreground/70">
                        {user.email}
                      </span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2">
                      <User size={16} />
                      프로필 및 설정
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="flex items-center gap-2"
                  >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    {theme === 'dark' ? '라이트 모드' : '다크 모드'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut size={16} />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-16 items-center border-b border-border/50 bg-glass px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="사이드바 열기"
            className="rounded-xl"
          >
            <Menu size={20} />
          </Button>
          <Link href="/dashboard" className="ml-3 flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-brand text-[11px] font-black text-white shadow-brand">
              L
            </span>
            Link<span className="text-gradient-brand">Brain</span>
          </Link>
        </header>

        {/* Desktop header */}
        <div className="hidden lg:block">
          <AppHeader />
        </div>

        {/* OmniSearch — available on all screen sizes via Cmd+K */}
        <OmniSearch />

        {/* Clip peek panel (side/center/full modes) */}
        <ClipPeekPanel />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* FAB — Quick clip add (hidden on mobile where bottom nav has add button) */}
        <button
          type="button"
          onClick={() => useUIStore.getState().openModal('addClip')}
          className="fixed bottom-8 right-8 z-40 hidden h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-white shadow-brand-lg transition-spring hover:scale-110 hover:shadow-brand-glow lg:flex"
          aria-label="클립 추가"
        >
          <Plus size={22} />
        </button>

        {/* Mobile bottom nav */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
