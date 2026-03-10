'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EdgeSwipeIndicatorProps {
  activeEdge: 'left' | 'right' | null;
  swipeOffset: number;
}

/**
 * Visual feedback for edge-swipe navigation.
 * Shows a rounded arrow indicator on the swiped edge.
 */
export function EdgeSwipeIndicator({ activeEdge, swipeOffset }: EdgeSwipeIndicatorProps) {
  if (!activeEdge || swipeOffset === 0) return null;

  const progress = Math.min(Math.abs(swipeOffset) / 60, 1);
  const isLeft = activeEdge === 'left';

  return (
    <div
      className={cn(
        'pointer-events-none fixed top-1/2 z-overlay -translate-y-1/2 lg:hidden',
        isLeft ? 'left-0' : 'right-0',
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full bg-background/90 shadow-lg border border-border/60 transition-transform duration-100',
          progress >= 1 && 'border-primary/40 bg-primary/10',
        )}
        style={{
          transform: `translateX(${isLeft ? Math.abs(swipeOffset) - 40 : -(Math.abs(swipeOffset) - 40)}px) scale(${0.6 + progress * 0.4})`,
          opacity: Math.min(progress * 2, 1),
        }}
      >
        {isLeft ? (
          <ChevronLeft
            size={20}
            className={cn('text-muted-foreground transition-colors', progress >= 1 && 'text-primary')}
          />
        ) : (
          <ChevronRight
            size={20}
            className={cn('text-muted-foreground transition-colors', progress >= 1 && 'text-primary')}
          />
        )}
      </div>
    </div>
  );
}
