'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut, User, Moon, Sun, Plus, Keyboard, ChevronsLeft, ChevronsRight, Search, Shield } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useUIStore } from '@/stores/ui-store';
import { useRealtimeInvalidation } from '@/lib/hooks/use-realtime-invalidation';
import { useGlobalShortcuts } from '@/lib/hooks/use-global-shortcuts';
import { supabase } from '@/lib/supabase/client';
import { MAIN_NAV } from '@/config/navigation';
import { useNavCounts } from '@/lib/hooks/use-nav-counts';
import { AppHeader } from '@/components/layout/app-header';
import { OmniSearch } from '@/components/layout/omni-search';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { PullToRefreshWrapper } from '@/components/layout/pull-to-refresh';
import { EdgeSwipeIndicator } from '@/components/layout/edge-swipe-indicator';
import { SidebarCategories } from '@/components/layout/sidebar-categories';
import { AdvancedFilters } from '@/components/layout/advanced-filters';
import { LinkbrainLogo } from '@/components/brand/linkbrain-logo';
import { ClipPeekPanel } from '@/components/clips/clip-peek-panel';
import { AddClipDialog } from '@/components/clips/add-clip-dialog';
import { KeyboardShortcutsDialog } from '@/components/layout/keyboard-shortcuts-dialog';
import { useEdgeSwipeNavigation } from '@/lib/hooks/use-edge-swipe-navigation';
import { useStatusBarScrollTop } from '@/lib/hooks/use-status-bar-scroll-top';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { TooltipProvider } from '@/components/ui/tooltip';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useSupabase();
  const { user: publicUser } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const { sidebarOpen, setSidebarOpen, openModal, isSidebarCollapsed, toggleSidebarCollapse, searchQuery, setSearchQuery } = useUIStore();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const { data: navCounts } = useNavCounts();

  const countByHref: Record<string, number> = {
    '/dashboard': navCounts?.total ?? 0,
    '/favorites': navCounts?.favorites ?? 0,
    '/read-later': navCounts?.readLater ?? 0,
    '/archive': navCounts?.archived ?? 0,
    '/collections': navCounts?.collections ?? 0,
  };

  // Single Realtime channel for cache invalidation
  // Must use publicUser.id (clips.user_id), NOT auth UID (user.id)
  useRealtimeInvalidation(publicUser?.id ?? null);

  // Global keyboard shortcuts
  useGlobalShortcuts();

  // Mobile-only features
  const isMobile = useIsMobile();
  const peekClipId = useUIStore((s) => s.peekClipId);
  const { swipeOffset, activeEdge } = useEdgeSwipeNavigation({ isEnabled: isMobile && !peekClipId, isSidebarOpen: sidebarOpen });
  useStatusBarScrollTop({ isEnabled: isMobile });

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
    <TooltipProvider>
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Safe area fill — fixed layer behind notch/Dynamic Island, always visible */}
      <div
        className="fixed top-0 left-0 right-0 z-[101] bg-background pointer-events-none lg:hidden"
        style={{ height: 'env(safe-area-inset-top, 0px)' }}
        aria-hidden="true"
      />
      {/* Skip navigation link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-background focus:text-foreground focus:underline focus:top-2 focus:left-2 focus:rounded-lg focus:border focus:border-border"
      >
        본문으로 건너뛰기
      </a>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[40] bg-surface-overlay lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="주 네비게이션"
        className={[
          'fixed inset-y-0 left-0 z-[50] flex-shrink-0 lg:z-sticky',
          'bg-background border-r border-border/50',
          'lg:bg-glass-heavy',
          'flex flex-col transition-all duration-200 ease-in-out',
          'lg:static lg:translate-x-0 lg:animate-slide-in-left',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          isSidebarCollapsed ? 'w-16' : 'w-64',
        ].join(' ')}
      >
        {/* Sidebar header — safe area padding for iOS notch/Dynamic Island */}
        <div
          className={[
            'flex items-center border-b border-border/50',
            isSidebarCollapsed ? 'justify-center px-3' : 'justify-between px-5',
          ].join(' ')}
          style={{ height: 'calc(4rem + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5"
          >
            {isSidebarCollapsed ? (
              <LinkbrainLogo variant="symbol" height={20} />
            ) : (
              <LinkbrainLogo variant="full" height={22} />
            )}
          </Link>
          {!isSidebarCollapsed && (
            <button
              type="button"
              className="rounded-lg p-1.5 text-muted-foreground transition-smooth hover:bg-accent hover:text-foreground lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="사이드바 닫기"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav
          aria-label="사이드바 메뉴"
          className={['flex-1 overflow-y-auto py-4', isSidebarCollapsed ? 'px-2' : 'px-3'].join(' ')}
        >
          {MAIN_NAV.map((section, idx) => (
            <div key={idx} className={idx > 0 ? 'mt-6' : ''}>
              {section.title && !isSidebarCollapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
                  {section.titleKo ?? section.title}
                </p>
              )}
              {section.title && isSidebarCollapsed && (
                <div className="mb-2 border-t border-border/30" />
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
                        title={isSidebarCollapsed ? item.labelKo : undefined}
                        className={[
                          'group relative flex items-center rounded-xl text-sm transition-spring',
                          isSidebarCollapsed
                            ? 'justify-center px-2 py-2.5'
                            : 'gap-3 px-3 py-2.5',
                          isActive
                            ? 'bg-gradient-brand-subtle font-semibold text-primary'
                            : 'font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                        ].join(' ')}
                        onClick={() => setSidebarOpen(false)}
                      >
                        {/* Active state is shown via bg/text color — no indicator bar */}
                        <span className={isActive ? 'icon-glow' : ''}>
                          <Icon
                            size={17}
                            className={[
                              'flex-shrink-0 transition-spring',
                              isActive ? 'text-primary' : 'group-hover-bounce',
                            ].join(' ')}
                          />
                        </span>
                        {!isSidebarCollapsed && (
                          <>
                            <span>{item.labelKo}</span>
                            {item.badge ? (
                              <span className="ml-auto rounded-full bg-gradient-brand px-1.5 py-0.5 text-[10px] font-bold text-white shadow-brand">
                                {item.badge}
                              </span>
                            ) : (countByHref[item.href] ?? 0) > 0 ? (
                              <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/50">
                                {countByHref[item.href]}
                              </span>
                            ) : null}
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Categories — hidden when collapsed */}
          {!isSidebarCollapsed && <SidebarCategories />}
        </nav>

        {/* Bottom section — collapse toggle + user profile */}
        <div className="border-t border-border/50 p-3">
          {/* Collapse toggle button — desktop only */}
          <button
            type="button"
            onClick={toggleSidebarCollapse}
            className={[
              'mb-2 hidden w-full items-center rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-spring hover:bg-accent/60 hover:text-foreground lg:flex',
              isSidebarCollapsed ? 'justify-center' : 'justify-between',
            ].join(' ')}
            aria-label={isSidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {!isSidebarCollapsed && <span>사이드바 접기</span>}
            {isSidebarCollapsed ? (
              <ChevronsRight size={16} aria-hidden="true" />
            ) : (
              <ChevronsLeft size={16} aria-hidden="true" />
            )}
          </button>

          {/* User profile */}
          <div className="mt-1">
            {isLoading ? (
              <div className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="h-9 w-9 flex-shrink-0 rounded-full" />
                {!isSidebarCollapsed && (
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2.5 w-14" />
                  </div>
                )}
              </div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={[
                      'group flex w-full items-center rounded-xl px-3 py-2 text-sm transition-spring hover:bg-accent/60 hover:glow-brand-sm',
                      isSidebarCollapsed ? 'justify-center gap-0' : 'gap-3',
                    ].join(' ')}
                    aria-label={`${displayName} 계정 메뉴`}
                    title={isSidebarCollapsed ? displayName : undefined}
                  >
                    <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-primary/30 transition-spring group-hover:ring-primary/60">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="bg-gradient-brand text-[11px] font-bold text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {!isSidebarCollapsed && (
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
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-56">
                  <DropdownMenuItem
                    onSelect={() => router.push('/settings')}
                    className="flex items-center gap-2"
                  >
                    <User size={16} />
                    프로필 및 설정
                  </DropdownMenuItem>
                  {publicUser?.role === 'admin' && (
                    <DropdownMenuItem
                      onSelect={() => router.push('/admin')}
                      className="flex items-center gap-2"
                    >
                      <Shield size={16} />
                      관리자 대시보드
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="flex items-center gap-2"
                  >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    {theme === 'dark' ? '라이트 모드' : '다크 모드'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openModal('shortcuts')}
                    className="flex items-center gap-2"
                  >
                    <Keyboard size={16} />
                    키보드 단축키
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
        {/* Desktop header */}
        <div className="hidden lg:block">
          <AppHeader />
        </div>

        {/* OmniSearch — available on all screen sizes via Cmd+K */}
        <OmniSearch />

        {/* Clip peek panel (side/center/full modes) */}
        <ClipPeekPanel />

        {/* Keyboard shortcuts help dialog */}
        <KeyboardShortcutsDialog />

        {/* Add clip dialog — available on all pages */}
        <AddClipDialog />

        {/* Page content — mobile header as stickyHeader inside scroll container */}
        <PullToRefreshWrapper
          stickyHeader={
            <header
              aria-label="앱 헤더"
              className="sticky top-0 z-40 flex flex-col border-b border-border/50 bg-background lg:hidden"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
            >
              <div className="flex h-16 items-center px-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="사이드바 열기"
                  className="rounded-xl"
                >
                  <Menu size={20} aria-hidden="true" />
                </Button>
                <Link href="/dashboard" className="ml-3 flex items-center">
                  <LinkbrainLogo variant="full" height={20} />
                </Link>
                <div className="ml-auto flex items-center gap-1">
                  <AdvancedFilters />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const next = !mobileSearchOpen;
                      setMobileSearchOpen(next);
                      if (!next) setSearchQuery('');
                      else setTimeout(() => mobileSearchRef.current?.focus(), 100);
                    }}
                    aria-label={mobileSearchOpen ? '검색 닫기' : '검색'}
                    className="rounded-xl"
                  >
                    {mobileSearchOpen ? <X size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
                  </Button>
                </div>
              </div>
              {/* Inline search bar */}
              {mobileSearchOpen && (
                <div className="flex items-center gap-2 border-t border-border/30 bg-muted/30 px-4 py-2">
                  <Search size={14} className="shrink-0 text-muted-foreground" />
                  <input
                    ref={mobileSearchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="키워드로 클립 검색..."
                    className="h-8 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                    autoComplete="off"
                    enterKeyHint="search"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="검색어 지우기"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
            </header>
          }
        >
          {children}
        </PullToRefreshWrapper>

        {/* FAB — Quick clip add (hidden on mobile where bottom nav has add button) */}
        <button
          type="button"
          onClick={() => useUIStore.getState().openModal('addClip')}
          className="fixed bottom-8 right-8 z-40 hidden h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-white shadow-brand-lg transition-spring hover:scale-110 hover:shadow-brand-glow lg:flex"
          aria-label="클립 추가"
        >
          <Plus size={22} aria-hidden="true" />
        </button>

        {/* Edge swipe navigation indicator */}
        <EdgeSwipeIndicator activeEdge={activeEdge} swipeOffset={swipeOffset} />

        {/* Mobile bottom nav */}
        <MobileBottomNav />
      </div>
    </div>
    </TooltipProvider>
  );
}
