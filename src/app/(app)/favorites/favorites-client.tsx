'use client';

import { useFavoriteClips } from '@/lib/hooks/use-clips';
import { ClipList } from '@/components/clips/clip-list';
import { ClipCardSkeleton } from '@/components/clips/clip-skeleton';
import { Star } from 'lucide-react';

export function FavoritesClient() {
  const { data, isLoading } = useFavoriteClips();

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
        <div className="relative flex flex-col items-center justify-center py-24 animate-blur-in animation-delay-100">
          {/* Glow orb */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative mb-4 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 p-5 ring-1 ring-amber-500/15">
            <Star
              size={32}
              className="animate-breathe text-amber-500"
              fill="currentColor"
            />
          </div>
          <p className="relative text-base font-semibold text-foreground">
            즐겨찾기한 클립이 없습니다
          </p>
          <p className="relative mt-1.5 text-sm text-muted-foreground">
            클립에서 별 아이콘을 눌러 즐겨찾기에 추가하세요
          </p>
        </div>
      ) : (
        <div className="relative animate-blur-in animation-delay-100">
          <ClipList clips={clips} />
        </div>
      )}
    </div>
  );
}
