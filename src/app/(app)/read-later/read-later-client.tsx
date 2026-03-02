'use client';

import { useReadLaterClips } from '@/lib/hooks/use-clips';
import { ClipList } from '@/components/clips/clip-list';
import { ClipCardSkeleton } from '@/components/clips/clip-skeleton';
import { Bookmark, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReadLaterClient() {
  const { data, isLoading, isError, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useReadLaterClips();

  const clips = data?.pages.flatMap((p) => p.data) ?? [];

  if (isError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold">클립을 불러오지 못했습니다</h2>
        <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'}</p>
        <Button onClick={() => refetch()} variant="outline">다시 시도</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <div className="mb-2 h-8 w-28 rounded-xl bg-muted shimmer" />
          <div className="h-4 w-52 rounded-lg bg-muted shimmer" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <ClipCardSkeleton key={i} />)}
        </div>
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
            <Bookmark size={20} className="text-blue-500 animate-breathe" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gradient-brand">나중에 읽기</h1>
            <p className="text-sm text-muted-foreground">나중에 읽으려고 저장한 클립을 모아볼 수 있습니다</p>
          </div>
        </div>
      </div>

      {clips.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center py-24 animate-blur-in animation-delay-100">
          {/* Glow orb */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative mb-4 rounded-2xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 p-5 ring-1 ring-blue-500/15">
            <Bookmark
              size={32}
              className="animate-breathe text-blue-500"
              fill="currentColor"
            />
          </div>
          <p className="relative text-base font-semibold text-foreground">
            나중에 읽기로 저장한 클립이 없습니다
          </p>
          <p className="relative mt-1.5 text-sm text-muted-foreground">
            클립에서 북마크 아이콘을 눌러 나중에 읽기에 추가하세요
          </p>
        </div>
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
