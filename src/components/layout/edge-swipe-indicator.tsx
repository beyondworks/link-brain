'use client';

import { cn } from '@/lib/utils';

interface EdgeSwipeIndicatorProps {
  activeEdge: 'left' | 'right' | null;
  swipeOffset: number;
}

/**
 * Visual feedback for edge-swipe navigation.
 * Shows a minimal bar indicator on the swiped edge (no arrows).
 */
export function EdgeSwipeIndicator({ activeEdge, swipeOffset }: EdgeSwipeIndicatorProps) {
  if (!activeEdge || swipeOffset === 0) return null;

  const progress = Math.min(Math.abs(swipeOffset) / 60, 1);
  const isLeft = activeEdge === 'left';

  return (
    <div
      className={cn(
        'pointer-events-none fixed top-1/2 z-[40] -translate-y-1/2 lg:hidden',
        isLeft ? 'left-0' : 'right-0',
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          'h-16 w-1 rounded-full transition-all duration-100',
          progress >= 1 ? 'bg-primary/60' : 'bg-muted-foreground/30',
        )}
        style={{
          transform: `translateX(${isLeft ? Math.abs(swipeOffset) * 0.15 : -(Math.abs(swipeOffset) * 0.15)}px) scaleY(${0.6 + progress * 0.4})`,
          opacity: Math.min(progress * 2, 1),
        }}
      />
    </div>
  );
}
