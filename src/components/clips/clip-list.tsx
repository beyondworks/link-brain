'use client';

import { useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { ClipData } from '@/types/database';
import { ClipCard } from '@/components/clips/clip-card';
import { ClipRow } from '@/components/clips/clip-row';
import { ClipHeadline } from '@/components/clips/clip-headline';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

interface ClipListProps {
  clips: ClipData[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
}

// Stagger delay classes for list items
const STAGGER_DELAYS = [
  'animation-delay-75',
  'animation-delay-150',
  'animation-delay-200',
  'animation-delay-300',
  'animation-delay-400',
  'animation-delay-500',
] as const;

export function ClipList({
  clips,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: ClipListProps) {
  const viewMode = useUIStore((s) => s.viewMode);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !fetchNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (clips.length === 0) {
    return (
      <div className="animate-fade-in-up flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-bold text-foreground">클립이 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">
          상단의 + 버튼을 눌러 첫 번째 클립을 추가해보세요.
        </p>
      </div>
    );
  }

  const footer = (
    <>
      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      )}
    </>
  );

  // Headlines view
  if (viewMode === 'headlines') {
    return (
      <div className="flex flex-col">
        {clips.map((clip, i) => {
          const delayClass = STAGGER_DELAYS[Math.min(i, STAGGER_DELAYS.length - 1)];
          return (
            <div
              key={clip.id}
              className={cn('animate-fade-in-up fill-both', delayClass)}
            >
              <ClipHeadline clip={clip} />
            </div>
          );
        })}
        {footer}
      </div>
    );
  }

  // Grid view
  if (viewMode === 'grid') {
    return (
      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {clips.map((clip, i) => {
            const delayClass = STAGGER_DELAYS[Math.min(i, STAGGER_DELAYS.length - 1)];
            return (
              <div
                key={clip.id}
                className={cn('animate-fade-in-up fill-both', delayClass)}
              >
                <ClipCard clip={clip} />
              </div>
            );
          })}
        </div>
        {footer}
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="flex flex-col gap-1">
        {clips.map((clip, i) => {
          const delayClass = STAGGER_DELAYS[Math.min(i, STAGGER_DELAYS.length - 1)];
          return (
            <div
              key={clip.id}
              className={cn('animate-fade-in-up fill-both', delayClass)}
            >
              <ClipRow clip={clip} />
            </div>
          );
        })}
      </div>
      {footer}
    </div>
  );
}
