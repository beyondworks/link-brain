'use client';

import React, { useMemo, useCallback } from 'react';
import { useToggleFavorite, useToggleArchive } from '@/lib/hooks/use-clip-mutations';
import { BookmarkPlus, X, BookOpen, TrendingUp, Star, Gauge, Sparkles, RotateCcw, Pin, Bell, Clock, LayoutGrid, List } from 'lucide-react';

import Link from 'next/link';
import { ClipList } from '@/components/clips/clip-list';
import { ClipCard } from '@/components/clips/clip-card';
import { ReminderDialog } from '@/components/clips/reminder-dialog';
import { SaveProgressBar } from '@/components/clips/save-progress-bar';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';
import { useClips } from '@/lib/hooks/use-clips';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useCategories } from '@/lib/hooks/use-categories';
import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats';
import { useCredits } from '@/lib/hooks/use-credits';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { ReadLaterList } from '@/components/clips/read-later-list';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { WeeklyReport } from '@/components/dashboard/weekly-report';
import { WelcomeDialog } from '@/components/onboarding/welcome-dialog';
import { DashboardSettings } from '@/components/dashboard/dashboard-settings';
import { useDashboardPreferences } from '@/lib/hooks/use-dashboard-preferences';
import { SearchResultsOverlay } from '@/components/layout/search-results-overlay';

import { cn } from '@/lib/utils';
import type { ClipData } from '@/types/database';

type QuickFilter = 'all' | 'favorite' | 'readLater' | 'unread';

/* ─── 리마인더 섹션 ──────────────────────────────────────────────────── */
function ReminderSection({ clips }: { clips: ClipData[] }) {
  const [dialogClipId, setDialogClipId] = React.useState<string | null>(null);
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const upcomingClips = clips.filter((clip) => {
    if (!clip.remind_at) return false;
    const remindDate = new Date(clip.remind_at);
    return remindDate >= now && remindDate <= threeDaysLater;
  });

  const openDialogClip = upcomingClips.find((c) => c.id === dialogClipId) ?? null;

  return (
    <>
      <div className="animate-fade-in-up animation-delay-150 mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
            곧 읽을 클립
          </span>
        </div>

        {upcomingClips.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-4 py-4 text-sm text-muted-foreground">
            <Clock size={14} className="shrink-0 text-muted-foreground/50" />
            리마인더가 설정된 클립이 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingClips.map((clip) => {
              const remindDate = new Date(clip.remind_at!);
              const isToday = remindDate.toDateString() === now.toDateString();
              const formattedTime = new Intl.DateTimeFormat('ko-KR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).format(remindDate);

              return (
                <div
                  key={clip.id}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 transition-colors hover:border-primary/30"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className={[
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px]',
                      isToday ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground',
                    ].join(' ')}>
                      <Clock size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/clip/${clip.id}`}
                        className="block truncate text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {clip.title ?? clip.url}
                      </Link>
                      <p className={[
                        'text-[11px] font-medium',
                        isToday ? 'text-primary' : 'text-muted-foreground',
                      ].join(' ')}>
                        {isToday ? `오늘 · ${formattedTime}` : formattedTime}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDialogClipId(clip.id)}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="리마인더 수정"
                  >
                    <Bell size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {openDialogClip && (
        <ReminderDialog
          open={!!dialogClipId}
          onOpenChange={(open) => { if (!open) setDialogClipId(null); }}
          clipId={openDialogClip.id}
          currentRemindAt={openDialogClip.remind_at}
        />
      )}
    </>
  );
}

const QUICK_FILTERS: { key: QuickFilter; label: string; emoji: string }[] = [
  { key: 'all', label: '전체', emoji: '✦' },
  { key: 'favorite', label: '즐겨찾기', emoji: '♥' },
  { key: 'unread', label: '안읽은 클립', emoji: '◷' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '좋은 새벽이에요';
  if (hour < 12) return '좋은 아침이에요';
  if (hour < 18) return '좋은 오후예요';
  return '좋은 저녁이에요';
}

function formatTodayDate(): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());
}


function ActiveCategoryBadge({ categoryId }: { categoryId: string }) {
  const { data: categories = [] } = useCategories();
  const setFilter = useUIStore((s) => s.setFilter);
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return null;

  return (
    <div className="animate-fade-in-up mb-4 flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm text-primary">
        <span
          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: cat.color ?? '#21DBA4' }}
        />
        <span className="font-medium">{cat.name}</span>
        <button
          type="button"
          onClick={() => setFilter('categoryId', null)}
          className="ml-1 rounded-md p-0.5 text-primary/60 transition-smooth hover:bg-primary/10 hover:text-primary"
          aria-label="카테고리 필터 해제"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  loading,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        <Icon size={16} />
      </div>
      {loading ? (
        <div className="mb-1.5 h-8 w-16 animate-pulse rounded-md bg-muted" />
      ) : (
        <p className="mb-1 text-3xl font-black tracking-tight text-foreground">{value}</p>
      )}
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function CompactStat({
  icon: Icon,
  value,
  label,
  loading,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-muted-foreground/60" />
      {loading ? (
        <div className="h-4 w-8 animate-pulse rounded bg-muted" />
      ) : (
        <span className="text-sm font-bold text-foreground">{value}</span>
      )}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function DashboardClient() {
  const { user: authUser } = useSupabase();
  const { user: publicUser } = useCurrentUser();
  const setQuickFilter = useUIStore((s) => s.setQuickFilter);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const filters = useUIStore((s) => s.filters);
  const sortBy = useUIStore((s) => s.sortBy);
  const sortOrder = useUIStore((s) => s.sortOrder);
  const { widgets, dashboardView, setDashboardView } = useDashboardPreferences();

  const { data: categories = [] } = useCategories();
  const toggleFavorite = useToggleFavorite();
  const toggleArchive = useToggleArchive();

  const categoryMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>();
    categories.forEach((c) => map.set(c.id, { name: c.name, color: c.color }));
    return map;
  }, [categories]);

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: credits, isLoading: creditsLoading } = useCredits();

  function formatCredits(): string {
    if (creditsLoading || !credits) return '—';
    if (credits.creditsLimit === -1) return '무제한';
    const remaining = credits.creditsLimit - credits.creditsUsed;
    return `${remaining} / ${credits.creditsLimit}`;
  }

  // Derive active quick filter from Zustand (single source of truth)
  const activeFilter: QuickFilter =
    filters.isFavorite ? 'favorite' : filters.readStatus === 'unread' ? 'unread' : 'all';

  const searchQuery = useUIStore((s) => s.searchQuery);

  const clipsFilter = useMemo(() => ({
    isArchived: filters.isArchived ?? false,
    ...(filters.isHidden !== null ? { isHidden: filters.isHidden } : {}),
    ...(filters.isFavorite ? { isFavorite: true as const } : {}),
    ...(filters.readStatus && filters.readStatus !== 'all' ? { readStatus: filters.readStatus } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.collectionId ? { collectionId: filters.collectionId } : {}),
    ...(filters.platform ? { platform: filters.platform as import('@/types/database').ClipPlatform } : {}),
    ...(filters.dateRange ? { dateRange: filters.dateRange } : {}),
    ...(filters.hasAiAnalysis !== null ? { hasAiAnalysis: filters.hasAiAnalysis } : {}),
  }), [filters.isFavorite, filters.readStatus, filters.categoryId, filters.collectionId, filters.platform, filters.dateRange, filters.hasAiAnalysis, filters.isArchived, filters.isHidden]);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const { data, isLoading, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage } = useClips({ filters: clipsFilter, sortBy, sortOrder, search: debouncedSearch || undefined });

  const clips = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const pinnedClips = useMemo(() => clips.filter((c) => c.is_pinned), [clips]);

  const handleToggleFavorite = useCallback(
    (id: string) => {
      const clip = clips.find((c) => c.id === id);
      if (clip) toggleFavorite.mutate({ clipId: id, isFavorite: clip.is_favorite });
    },
    [clips, toggleFavorite]
  );

  const handleArchive = useCallback(
    (id: string) => {
      const clip = clips.find((c) => c.id === id);
      if (clip) toggleArchive.mutate({ clipId: id, isArchived: clip.is_archived });
    },
    [clips, toggleArchive]
  );
  const hasActiveFilters = useMemo(() =>
    filters.categoryId || filters.collectionId || filters.platform ||
    filters.isFavorite || filters.readStatus === 'unread',
  [filters.categoryId, filters.collectionId, filters.platform, filters.isFavorite, filters.readStatus]);

  const handleFilterClick = useCallback((key: QuickFilter) => {
    setQuickFilter(key);
  }, [setQuickFilter]);

  return (
    <div className="animate-blur-in p-6 lg:p-8">
      {/* Save progress indicator — sticky at top */}
      <SaveProgressBar />

      {/* Page header */}
      <div className="animate-fade-in-up mb-10">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
          {formatTodayDate()}
        </p>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-3xl">
              <span className="text-foreground">{getGreeting()},&nbsp;</span>
              <span className="text-gradient-shimmer">
                {authUser?.user_metadata?.display_name
                  ?? authUser?.user_metadata?.full_name
                  ?? authUser?.email?.split('@')[0]
                  ?? 'LinkBrain'}
              </span>
            </h1>
            <p className="mt-1 truncate text-xs text-muted-foreground/70">
              저장된 클립을 확인하고 관리하세요.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Dashboard view toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-0.5">
              <button
                onClick={() => setDashboardView('summary')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-spring',
                  dashboardView === 'summary'
                    ? 'bg-gradient-brand text-white shadow-brand'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                요약
              </button>
              <button
                onClick={() => setDashboardView('detail')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-spring',
                  dashboardView === 'detail'
                    ? 'bg-gradient-brand text-white shadow-brand'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                상세
              </button>
            </div>
            <DashboardSettings />
          </div>
        </div>
      </div>

      {/* Stats — detail: full cards, summary: compact inline */}
      {widgets.stats && dashboardView === 'detail' && (
        <div className="animate-fade-in-up animation-delay-50 mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            icon={BookOpen}
            value={statsLoading ? '—' : String(stats?.totalClips ?? 0)}
            label="총 클립 수"
            loading={statsLoading}
          />
          <StatCard
            icon={TrendingUp}
            value={statsLoading ? '—' : String(stats?.thisMonthClips ?? 0)}
            label="이번 달 저장"
            loading={statsLoading}
          />
          <StatCard
            icon={Star}
            value={statsLoading ? '—' : String(stats?.favoriteCount ?? 0)}
            label="즐겨찾기"
            loading={statsLoading}
          />
          <StatCard
            icon={Gauge}
            value={formatCredits()}
            label="크레딧 잔여"
            loading={creditsLoading}
          />
        </div>
      )}
      {widgets.stats && dashboardView === 'summary' && (
        <div className="animate-fade-in-up animation-delay-50 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border/60 bg-card px-5 py-3 shadow-card">
          <CompactStat icon={BookOpen} value={statsLoading ? '—' : String(stats?.totalClips ?? 0)} label="클립" loading={statsLoading} />
          <div className="h-4 w-px bg-border/40" />
          <CompactStat icon={TrendingUp} value={statsLoading ? '—' : String(stats?.thisMonthClips ?? 0)} label="이번 달" loading={statsLoading} />
          <div className="h-4 w-px bg-border/40" />
          <CompactStat icon={Star} value={statsLoading ? '—' : String(stats?.favoriteCount ?? 0)} label="즐겨찾기" loading={statsLoading} />
          <div className="h-4 w-px bg-border/40" />
          <CompactStat icon={Gauge} value={formatCredits()} label="크레딧" loading={creditsLoading} />
        </div>
      )}

      {/* Weekly Report — detail only */}
      {widgets.weeklyReport && dashboardView === 'detail' && <WeeklyReport />}

      {/* Continue Reading + Recent Activity — detail only */}
      {publicUser && dashboardView === 'detail' && (widgets.continueReading || widgets.recentActivity) && (
        <div className="animate-fade-in-up animation-delay-75 mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {widgets.continueReading && <ReadLaterList userId={publicUser.id} />}
          {widgets.recentActivity && <RecentActivity userId={publicUser.id} />}
        </div>
      )}

      {/* Active category filter indicator */}
      {filters.categoryId && (
        <ActiveCategoryBadge categoryId={filters.categoryId} />
      )}

      {/* Quick filters + view mode toggle */}
      <div className="animate-fade-in-up animation-delay-100 mb-7 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <div className="flex shrink-0 gap-1.5">
          {QUICK_FILTERS.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => handleFilterClick(key)}
              className={[
                'flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition-spring',
                activeFilter === key
                  ? 'bg-gradient-brand text-white shadow-brand hover-scale'
                  : 'border border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:bg-accent/60 hover:text-foreground',
              ].join(' ')}
            >
              <span className="text-[10px]">{emoji}</span>
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center rounded-lg border border-border/50 bg-muted/30 p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex items-center justify-center rounded-md p-1.5 transition-spring',
              viewMode === 'grid'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="그리드 보기"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center justify-center rounded-md p-1.5 transition-spring',
              viewMode === 'list'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="리스트 보기"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="divider-gradient animate-fade-in-up animation-delay-150 mb-7" />

      {/* Reminder section — detail only */}
      {widgets.reminders && dashboardView === 'detail' && !isLoading && <ReminderSection clips={clips} />}

      {/* Pinned clips — detail only */}
      {widgets.pinnedClips && dashboardView === 'detail' && !isLoading && pinnedClips.length > 0 && (
        <div className="animate-fade-in-up animation-delay-150 mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Pin className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
              고정된 클립
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {pinnedClips.slice(0, 5).map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                onToggleFavorite={handleToggleFavorite}
                onArchive={handleArchive}
                categoryName={clip.category_id ? categoryMap.get(clip.category_id)?.name : undefined}
                categoryColor={clip.category_id ? categoryMap.get(clip.category_id)?.color : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search results overlay — categories, collections, images */}
      {debouncedSearch && <SearchResultsOverlay search={debouncedSearch} />}

      {/* Content */}
      <div className={['animate-fade-in-up animation-delay-200', isFetching && !isLoading ? 'opacity-60 transition-opacity duration-200' : ''].join(' ')}>
        {isLoading ? (
          <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">
            불러오는 중...
          </div>
        ) : clips.length === 0 && !hasActiveFilters ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5">
              <Sparkles size={28} className="text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">첫 번째 클립을 저장해보세요</h2>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              URL을 입력하면 AI가 자동으로 분석하고 정리합니다
            </p>
            <Button
              onClick={() => useUIStore.getState().openModal('addClip')}
              className="mt-6 rounded-xl bg-gradient-brand px-6 text-white shadow-brand hover-scale"
            >
              <BookmarkPlus size={15} className="mr-2" />
              클립 추가
            </Button>
            <p className="mt-4 text-xs text-muted-foreground/70">
              또는{' '}
              <Link href="/features" className="underline underline-offset-2 hover:text-primary transition-colors">
                브라우저 확장 프로그램을 사용해보세요
              </Link>
            </p>
          </div>
        ) : clips.length === 0 && hasActiveFilters ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-base font-semibold text-foreground">검색 결과가 없습니다</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              다른 필터를 선택하거나 필터를 초기화해보세요
            </p>
            <Button
              variant="outline"
              onClick={() => useUIStore.getState().clearFilters()}
              className="mt-5 rounded-xl"
            >
              <RotateCcw size={14} className="mr-2" />
              필터 초기화
            </Button>
          </div>
        ) : (
          <ClipList
            clips={clips}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        )}
      </div>

      <WelcomeDialog />
    </div>
  );
}
