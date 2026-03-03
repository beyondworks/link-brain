'use client';

import { useFavoriteClips } from '@/lib/hooks/use-clips';
import { ClipList } from '@/components/clips/clip-list';
import { ClipListSkeleton } from '@/components/skeletons/clip-list-skeleton';
import { ErrorRetry } from '@/components/ui/error-retry';
import { EmptyState } from '@/components/ui/empty-state';
import { useUIStore } from '@/stores/ui-store';
import { Star } from 'lucide-react';

export function FavoritesClient() {
  const viewMode = useUIStore((s) => s.viewMode);
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useFavoriteClips();

  const clips = data?.pages.flatMap((p) => p.data) ?? [];

  if (isError) {
    return (
      <ErrorRetry
        error={error}
        onRetry={() => refetch()}
        message="즐겨찾기 클립을 불러오는 중 오류가 발생했습니다"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <div className="mb-2 h-8 w-28 rounded-xl bg-muted animate-pulse" />
          <div className="h-4 w-52 rounded-lg bg-muted animate-pulse" />
        </div>
        <ClipListSkeleton viewMode={viewMode} count={6} />
      </div>
    );
  }

  return (
    <div className="relative p-6 lg:p-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glow-orb absolute -right-20 -top-20 h-56 w-56 opacity-25" />
      </div>

      <div className="relative mb-8 animate-blur-in">
        <div className="flex items-center gap-3">
          <div className="icon-glow relative rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-3 ring-1 ring-amber-500/20">
            <Star size={20} className="text-amber-500 animate-breathe" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gradient-brand">즐겨찾기</h1>
            <p className="text-sm text-muted-foreground">별표를 표시한 클립을 모아볼 수 있습니다</p>
          </div>
        </div>
      </div>

      {clips.length === 0 ? (
        <EmptyState
          icon={Star}
          title="즐겨찾기한 클립이 없습니다"
          description="클립에서 별 아이콘을 눌러 즐겨찾기에 추가하세요"
          className="animate-blur-in animation-delay-100"
        />
      ) : (
        <div className="relative animate-blur-in animation-delay-100">
          <ClipList
            clips={clips}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </div>
      )}
    </div>
  );
}
