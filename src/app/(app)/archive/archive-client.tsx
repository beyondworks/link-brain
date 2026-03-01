'use client';

import { useArchivedClips } from '@/lib/hooks/use-clips';
import { ClipList } from '@/components/clips/clip-list';
import { ClipCardSkeleton } from '@/components/clips/clip-skeleton';
import { Archive } from 'lucide-react';

export function ArchiveClient() {
  const { data, isLoading } = useArchivedClips();

  const clips = data?.pages.flatMap((p) => p.data) ?? [];

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">아카이브</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <ClipCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">아카이브</h1>
      {clips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Archive size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">아카이브된 클립이 없습니다</p>
          <p className="mt-1 text-sm">클립을 아카이브하면 여기에 표시됩니다</p>
        </div>
      ) : (
        <ClipList clips={clips} />
      )}
    </div>
  );
}
