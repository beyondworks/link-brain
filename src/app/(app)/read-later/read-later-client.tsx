'use client';

import { useReadLaterClips } from '@/lib/hooks/use-clips';
import { ClipList } from '@/components/clips/clip-list';
import { ClipListSkeleton } from '@/components/skeletons/clip-list-skeleton';
import { ErrorRetry } from '@/components/ui/error-retry';
import { EmptyState } from '@/components/ui/empty-state';
import { useUIStore } from '@/stores/ui-store';
import { BookmarkPlus } from 'lucide-react';

export function ReadLaterClient() {
  const viewMode = useUIStore((s) => s.viewMode);
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useReadLaterClips();

  const clips = data?.pages.flatMap((p) => p.data) ?? [];

  if (isError) {
    return (
      <ErrorRetry
        error={error instanceof Error ? error : null}
        onRetry={() => refetch()}
        message="나중에 읽기 클립을 불러오는 중 오류가 발생했습니다"
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
          <div className="icon-glow relative rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 p-3 ring-1 ring-blue-500/20">
            <BookmarkPlus size={20} className="text-blue-500 animate-breathe" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gradient-brand">나중에 읽기</h1>
            <p className="text-sm text-muted-foreground">나중에 읽으려고 저장한 클립을 모아볼 수 있습니다</p>
          </div>
        </div>
      </div>

      {clips.length === 0 ? (
        <EmptyState
          icon={BookmarkPlus}
          title="나중에 읽기로 저장한 클립이 없습니다"
          description="클립에서 북마크 아이콘을 눌러 나중에 읽기에 추가하세요"
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
