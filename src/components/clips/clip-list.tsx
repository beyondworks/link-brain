'use client';

import type { ClipData } from '@/types/database';
import { ClipCard } from '@/components/clips/clip-card';
import { ClipRow } from '@/components/clips/clip-row';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

interface ClipListProps {
  clips: ClipData[];
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

export function ClipList({ clips }: ClipListProps) {
  const viewMode = useUIStore((s) => s.viewMode);

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

  // Grid view
  if (viewMode === 'grid' || viewMode === 'headlines') {
    return (
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
    );
  }

  // List view
  return (
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
  );
}
