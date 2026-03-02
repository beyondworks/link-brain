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
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <Skeleton className="mb-2 h-8 w-48 rounded-xl shimmer" />
          <Skeleton className="h-4 w-72 rounded-lg shimmer" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <ClipCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex flex-col items-center justify-center p-6 lg:p-8 py-24">
        <div className="mb-4 rounded-xl bg-muted p-4 w-fit">
          <FolderOpen size={32} className="text-muted-foreground" />
        </div>
        <p className="text-base font-semibold text-foreground">컬렉션을 찾을 수 없습니다</p>
      </div>
    );
  }

  const validClips = (clips ?? []) as unknown as ClipData[];
  const accentColor = collection.color ?? '#21DBA4';

  return (
    <div className="relative">
      {/* Hero header with mesh gradient tinted by collection color */}
      <div className="relative overflow-hidden bg-gradient-mesh px-6 py-8 lg:px-8 lg:py-10">
        {/* Color-tinted glow orb */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-25"
          style={{ backgroundColor: accentColor }}
        />
        <div
          className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full blur-2xl opacity-15"
          style={{ backgroundColor: accentColor }}
        />

        {/* Animated top border with collection color */}
        <div
          className="absolute inset-x-0 top-0 h-0.5"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
        />

        <div className="relative animate-blur-in">
          <div className="flex items-center gap-3">
            {/* Color indicator with glow */}
            <div className="relative flex-shrink-0">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <div
                className="absolute inset-0 rounded-full blur-md opacity-70"
                style={{ backgroundColor: accentColor }}
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {collection.name}
            </h1>
          </div>
          {collection.description && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed pl-7">
              {collection.description}
            </p>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="p-6 lg:p-8">
        {clipsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => <ClipCardSkeleton key={i} />)}
          </div>
        ) : validClips.length === 0 ? (
          <div className="relative flex flex-col items-center justify-center py-24 animate-blur-in animation-delay-100">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-20"
              style={{ backgroundColor: accentColor }}
            />
            <div
              className="relative mb-4 rounded-2xl p-5 ring-1 ring-white/10"
              style={{
                background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}08)`,
              }}
            >
              <FolderOpen size={32} className="animate-float" style={{ color: accentColor }} />
            </div>
            <p className="relative text-base font-semibold text-foreground">
              이 컬렉션에 클립이 없습니다
            </p>
            <p className="relative mt-1.5 text-sm text-muted-foreground">
              클립을 추가해 컬렉션을 채워보세요
            </p>
          </div>
        ) : (
          <div className="animate-blur-in animation-delay-100">
            <ClipList clips={validClips} />
          </div>
        )}
      </div>
    </div>
  );
}
