'use client';

import { useArchivedClips } from '@/lib/hooks/use-clips';
import { ClipList } from '@/components/clips/clip-list';
import { ClipListSkeleton } from '@/components/skeletons/clip-list-skeleton';
import { ErrorRetry } from '@/components/ui/error-retry';
import { EmptyState } from '@/components/ui/empty-state';
import { useUIStore } from '@/stores/ui-store';
import { Archive } from 'lucide-react';

export function ArchiveClient() {
  const viewMode = useUIStore((s) => s.viewMode);
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useArchivedClips();

  const clips = data?.pages.flatMap((p) => p.data) ?? [];

  if (isError) {
    return (
      <ErrorRetry
        error={error}
        onRetry={() => refetch()}
        message="아카이브 클립을 불러오는 중 오류가 발생했습니다"
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
        <div className="glow-orb absolute -left-16 -top-16 h-48 w-48 opacity-20" />
      </div>

      <div className="relative mb-8 animate-blur-in">
        <div className="flex items-center gap-3">
          <div className="icon-glow relative rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-500/5 p-3 ring-1 ring-slate-500/20">
            <Archive size={20} className="text-slate-500 animate-breathe" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gradient-brand">아카이브</h1>
            <p className="text-sm text-muted-foreground">보관 처리한 클립을 여기서 확인하세요</p>
          </div>
        </div>
      </div>

      {clips.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="아카이브된 클립이 없습니다"
          description="클립을 아카이브하면 여기에 표시됩니다"
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
