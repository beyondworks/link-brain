'use client';

import { useCollection, useCollectionClips } from '@/lib/hooks/use-collections';
import { ClipList } from '@/components/clips/clip-list';
import { ClipCardSkeleton } from '@/components/clips/clip-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen } from 'lucide-react';
import type { ClipData } from '@/types/database';

interface Props {
  collectionId: string;
}

export function CollectionDetailClient({ collectionId }: Props) {
  const { data: collection, isLoading: collectionLoading } = useCollection(collectionId);
  const { data: clips, isLoading: clipsLoading } = useCollectionClips(collectionId);

  if (collectionLoading) {
    return (
      <div className="p-6">
        <Skeleton className="mb-2 h-8 w-48" />
        <Skeleton className="mb-6 h-4 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <ClipCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex flex-col items-center justify-center p-6 py-20 text-muted-foreground">
        <p className="text-lg font-medium">컬렉션을 찾을 수 없습니다</p>
      </div>
    );
  }

  const validClips = (clips ?? []) as unknown as ClipData[];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: collection.color ?? '#6366f1' }}
          />
          <h1 className="text-2xl font-bold">{collection.name}</h1>
        </div>
        {collection.description && (
          <p className="mt-2 text-muted-foreground">{collection.description}</p>
        )}
      </div>

      {clipsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <ClipCardSkeleton key={i} />)}
        </div>
      ) : validClips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderOpen size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">이 컬렉션에 클립이 없습니다</p>
        </div>
      ) : (
        <ClipList clips={validClips} />
      )}
    </div>
  );
}
