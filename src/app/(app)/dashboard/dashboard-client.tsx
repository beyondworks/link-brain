'use client';

import { BookmarkPlus, X, BookOpen, TrendingUp, Star, Gauge } from 'lucide-react';
import { ClipList } from '@/components/clips/clip-list';
import { AddClipDialog } from '@/components/clips/add-clip-dialog';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/ui-store';
import { useClips } from '@/lib/hooks/use-clips';
import { useCategories } from '@/lib/hooks/use-categories';
import { SEED_CLIPS } from '@/config/seed-clips';
import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats';
import { useCredits } from '@/lib/hooks/use-credits';

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

export function DashboardClient() {
  const openModal = useUIStore((s) => s.openModal);
  const setQuickFilter = useUIStore((s) => s.setQuickFilter);
  const filters = useUIStore((s) => s.filters);

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
    filters.isFavorite ? 'favorite' : filters.isReadLater ? 'readLater' : 'all';

  const clipsFilter = {
    isArchived: false as const,
    ...(filters.isFavorite ? { isFavorite: true as const } : {}),
    ...(filters.isReadLater ? { isReadLater: true as const } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.collectionId ? { collectionId: filters.collectionId } : {}),
    ...(filters.platform ? { platform: filters.platform as import('@/types/database').ClipPlatform } : {}),
  };

  const { data, isLoading, isFetching, hasNextPage, isFetchingNextPage, fetchNextPage } = useClips({ filters: clipsFilter });

  const clips = data?.pages.flatMap((page) => page.data) ?? [];
  const hasActiveFilters =
    filters.categoryId || filters.collectionId || filters.platform ||
    filters.isFavorite || filters.isReadLater;
  const displayClips = (!hasActiveFilters && clips.length === 0) ? SEED_CLIPS : clips;

  function handleFilterClick(key: QuickFilter) {
    setQuickFilter(key);
  }

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

      {/* Content */}
      <div className={['animate-fade-in-up animation-delay-200', isFetching && !isLoading ? 'opacity-60 transition-opacity duration-200' : ''].join(' ')}>
        {isLoading ? (
          <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">
            불러오는 중...
          </div>
        ) : (
          <>
            {clips.length === 0 && displayClips.length > 0 && (
              <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                <span>데모 클립이 표시되고 있습니다. 클립을 추가하면 실제 데이터로 대체됩니다.</span>
                <Button
                  size="sm"
                  onClick={() => openModal('addClip')}
                  className="shrink-0 rounded-lg bg-gradient-brand text-white shadow-brand hover-scale"
                >
                  <BookmarkPlus size={13} className="mr-1" />
                  클립 추가
                </Button>
              </div>
            )}
            <ClipList
                clips={displayClips}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              />

          </>
        )}
      </div>

      <AddClipDialog />
    </div>
  );
}
