'use client';

import { useRef, useCallback, useEffect } from 'react';

const LONG_PRESS_DURATION = 500;
const MOVE_THRESHOLD = 10;

interface UseLongPressOptions {
  onLongPress: () => void;
  isEnabled?: boolean;
}

/**
 * Returns event handlers for long-press detection.
 * Cancels if finger moves beyond threshold or touch ends too early.
 * Timer is cleaned up on unmount to prevent stale callbacks.
 */
export function useLongPress({ onLongPress, isEnabled = true }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Clean up timer on unmount to prevent stale callback
  useEffect(() => clear, [clear]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isEnabled) return;
      firedRef.current = false;
      const touch = e.touches[0];
      // Capture position immediately — touch event data becomes stale after timeout
      const pos = { x: touch.clientX, y: touch.clientY };
      startPos.current = pos;
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        onLongPress();
      }, LONG_PRESS_DURATION);
    },
    [isEnabled, onLongPress],
  );

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (isEnabled) e.preventDefault();
    },
    [isEnabled],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!timerRef.current) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startPos.current.x);
      const dy = Math.abs(touch.clientY - startPos.current.y);
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
        clear();
      }
    },
    [clear],
  );

  const onTouchEnd = useCallback(
    () => {
      clear();
      // Click suppression is handled by longPressFired ref guard in the click handler.
      // e.preventDefault() in touchend does NOT reliably cancel the synthetic click on iOS Safari.
    },
    [clear],
  );

  return { onTouchStart, onTouchMove, onTouchEnd, onContextMenu, longPressFired: firedRef };
}
