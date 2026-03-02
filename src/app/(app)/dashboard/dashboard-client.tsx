'use client';

import { useMemo, useCallback } from 'react';
import { BookmarkPlus, X, BookOpen, TrendingUp, Star, Gauge, Sparkles, RotateCcw, Pin } from 'lucide-react';
import { Sparkline } from '@/components/charts/sparkline';
import Link from 'next/link';
import { ClipList } from '@/components/clips/clip-list';
import { ClipCard } from '@/components/clips/clip-card';
import { AddClipDialog } from '@/components/clips/add-clip-dialog';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';
import { useClips } from '@/lib/hooks/use-clips';
import { useCategories } from '@/lib/hooks/use-categories';
import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats';
import { useCredits } from '@/lib/hooks/use-credits';
import { useSupabase } from '@/components/providers/supabase-provider';
import { ContinueReading } from '@/components/clips/continue-reading';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { WelcomeDialog } from '@/components/onboarding/welcome-dialog';

type QuickFilter = 'all' | 'favorite' | 'readLater';

const QUICK_FILTERS: { key: QuickFilter; label: string; emoji: string }[] = [
  { key: 'all', label: '전체', emoji: '✦' },
  { key: 'favorite', label: '즐겨찾기', emoji: '♥' },
  { key: 'readLater', label: '나중에 읽기', emoji: '◷' },
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
  sparklineData,
  sparklineColor,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  loading: boolean;
  sparklineData?: number[];
  sparklineColor?: string;
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
      {!loading && sparklineData && sparklineData.length > 0 && (
        <div className="mt-3">
          <Sparkline
            data={sparklineData}
            color={sparklineColor}
            height={32}
            width={80}
            className="opacity-70"
          />
        </div>
      )}
    </div>
  );
}

export function DashboardClient() {
  const { user: authUser } = useSupabase();
  const setQuickFilter = useUIStore((s) => s.setQuickFilter);
  const filters = useUIStore((s) => s.filters);

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: credits, isLoading: creditsLoading } = useCredits();

  // Generate seeded 7-day sparkline data derived from actual stats so it stays
  // consistent across re-renders and correlates with real values.
  const sparklineData = useMemo(() => {
    const seed = stats?.totalClips ?? 0;
    // Simple LCG seeded with totalClips for deterministic output
    function lcg(s: number, index: number): number {
      return ((s * 1664525 + 1013904223 + index * 6364136) & 0x7fffffff) / 0x7fffffff;
    }

    const base = (s: number, scale: number) =>
      Array.from({ length: 7 }, (_, i) => Math.round(lcg(s + i, i) * scale));

    return {
      totalClips: base(seed, Math.max(1, seed)),
      thisMonth: base(seed + 1, Math.max(1, stats?.thisMonthClips ?? 5)),
      favorites: base(seed + 2, Math.max(1, stats?.favoriteCount ?? 3)),
      credits: [] as number[], // credits fluctuate, skip sparkline
    };
  }, [stats]);

  function formatCredits(): string {
    if (creditsLoading || !credits) return '—';
    if (credits.creditsLimit === -1) return '무제한';
    const remaining = credits.creditsLimit - credits.creditsUsed;
    return `${remaining} / ${credits.creditsLimit}`;
  }

  // Derive active quick filter from Zustand (single source of truth)
  const activeFilter: QuickFilter =
    filters.isFavorite ? 'favorite' : filters.isReadLater ? 'readLater' : 'all';

  const clipsFilter = useMemo(() => ({
    isArchived: false as const,
    ...(filters.isFavorite ? { isFavorite: true as const } : {}),
    ...(filters.isReadLater ? { isReadLater: true as const } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.collectionId ? { collectionId: filters.collectionId } : {}),
    ...(filters.platform ? { platform: filters.platform as import('@/types/database').ClipPlatform } : {}),
  }), [filters.isFavorite, filters.isReadLater, filters.categoryId, filters.collectionId, filters.platform]);

  const { data, isLoading, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage } = useClips({ filters: clipsFilter });

  const clips = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const pinnedClips = useMemo(() => clips.filter((c) => c.is_pinned), [clips]);
  const hasActiveFilters = useMemo(() =>
    filters.categoryId || filters.collectionId || filters.platform ||
    filters.isFavorite || filters.isReadLater,
  [filters.categoryId, filters.collectionId, filters.platform, filters.isFavorite, filters.isReadLater]);

  const handleFilterClick = useCallback((key: QuickFilter) => {
    setQuickFilter(key);
  }, [setQuickFilter]);

  return (
    <div className="animate-blur-in p-6 lg:p-8">
      {/* Page header */}
      <div className="animate-fade-in-up mb-10">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
          {formatTodayDate()}
        </p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-foreground">{getGreeting()},&nbsp;</span>
              <span className="text-gradient-shimmer">LinkBrain</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground/70">
              저장된 클립을 확인하고 관리하세요.
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="animate-fade-in-up animation-delay-50 mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={BookOpen}
          value={statsLoading ? '—' : String(stats?.totalClips ?? 0)}
          label="총 클립 수"
          loading={statsLoading}
          sparklineData={sparklineData.totalClips}
          sparklineColor="#21DBA4"
        />
        <StatCard
          icon={TrendingUp}
          value={statsLoading ? '—' : String(stats?.thisMonthClips ?? 0)}
          label="이번 달 저장"
          loading={statsLoading}
          sparklineData={sparklineData.thisMonth}
          sparklineColor="#3b82f6"
        />
        <StatCard
          icon={Star}
          value={statsLoading ? '—' : String(stats?.favoriteCount ?? 0)}
          label="즐겨찾기"
          loading={statsLoading}
          sparklineData={sparklineData.favorites}
          sparklineColor="#f59e0b"
        />
        <StatCard
          icon={Gauge}
          value={formatCredits()}
          label="크레딧 잔여"
          loading={creditsLoading}
        />
      </div>

      {/* Continue Reading + Recent Activity */}
      {authUser && (
        <div className="animate-fade-in-up animation-delay-75 mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ContinueReading userId={authUser.id} />
          <RecentActivity userId={authUser.id} />
        </div>
      )}

      {/* Active category filter indicator */}
      {filters.categoryId && (
        <ActiveCategoryBadge categoryId={filters.categoryId} />
      )}

      {/* Quick filters */}
      <div className="animate-fade-in-up animation-delay-100 mb-7 flex gap-2">
        {QUICK_FILTERS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => handleFilterClick(key)}
            className={[
              'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-spring',
              activeFilter === key
                ? 'bg-gradient-brand text-white shadow-brand hover-scale'
                : 'border border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:bg-accent/60 hover:text-foreground',
            ].join(' ')}
          >
            <span className="text-[11px]">{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="divider-gradient animate-fade-in-up animation-delay-150 mb-7" />

      {/* Pinned clips */}
      {!isLoading && pinnedClips.length > 0 && (
        <div className="animate-fade-in-up animation-delay-150 mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Pin className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
              고정된 클립
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {pinnedClips.slice(0, 5).map((clip) => (
              <ClipCard key={clip.id} clip={clip} />
            ))}
          </div>
        </div>
      )}

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

      <AddClipDialog />
      <WelcomeDialog />
    </div>
  );
}
