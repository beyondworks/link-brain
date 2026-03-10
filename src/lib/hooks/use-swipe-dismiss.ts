'use client';

import { useRef, useCallback } from 'react';

const SWIPE_THRESHOLD = 50;

interface UseSwipeDismissOptions {
  /** Direction to swipe for dismissal */
  direction: 'left' | 'right';
  onDismiss: () => void;
  isEnabled?: boolean;
}

/**
 * Returns touch event handlers for swipe-to-dismiss on a panel/drawer.
 * Attach the returned handlers to the container element.
 */
export function useSwipeDismiss({
  direction,
  onDismiss,
  isEnabled = true,
}: UseSwipeDismissOptions) {
  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isEnabled) return;
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    },
    [isEnabled],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isEnabled) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX.current;
      const dy = Math.abs(endY - startY.current);

      // Ignore if vertical movement dominates
      if (dy > Math.abs(dx)) return;

      if (direction === 'right' && dx > SWIPE_THRESHOLD) {
        onDismiss();
      } else if (direction === 'left' && dx < -SWIPE_THRESHOLD) {
        onDismiss();
      }
    },
    [isEnabled, direction, onDismiss],
  );

  return { onTouchStart, onTouchEnd };
}
