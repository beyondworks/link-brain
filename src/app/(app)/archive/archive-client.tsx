'use client';

import { useArchivedClips } from '@/lib/hooks/use-clips';
import { ClipList } from '@/components/clips/clip-list';
import { ClipCardSkeleton } from '@/components/clips/clip-skeleton';
import { Archive } from 'lucide-react';

export function ArchiveClient() {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useArchivedClips();

  const clips = data?.pages.flatMap((p) => p.data) ?? [];

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
        <div className="relative flex flex-col items-center justify-center py-24 animate-blur-in animation-delay-100">
          {/* Glow orb */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-500/8 blur-3xl" />
          <div className="relative mb-4 rounded-2xl bg-gradient-to-br from-slate-500/15 to-slate-500/5 p-5 ring-1 ring-slate-500/15">
            <Archive size={32} className="animate-float text-slate-500" />
          </div>
          <p className="relative text-base font-semibold text-foreground">
            아카이브된 클립이 없습니다
          </p>
          <p className="relative mt-1.5 text-sm text-muted-foreground">
            클립을 아카이브하면 여기에 표시됩니다
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
