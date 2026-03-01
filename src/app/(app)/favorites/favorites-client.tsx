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
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">즐겨찾기</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <ClipCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">즐겨찾기</h1>
      {clips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Star size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">즐겨찾기한 클립이 없습니다</p>
          <p className="mt-1 text-sm">클립에서 별 아이콘을 눌러 즐겨찾기에 추가하세요</p>
        </div>
      ) : (
        <ClipList clips={clips} />
      )}
    </div>
  );
}
