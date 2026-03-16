'use client';

import { useRef, useCallback, useEffect } from 'react';

const LONG_PRESS_DURATION = 400; // Shorter than iOS native ~500ms to fire first
const MOVE_THRESHOLD = 10;

interface UseLongPressOptions {
  onLongPress: (touchPosition: { x: number; y: number }) => void;
  isEnabled?: boolean;
}

/**
 * Returns event handlers for long-press detection.
 * Cancels if finger moves beyond threshold or touch ends too early.
 * Clears iOS native text selection on fire.
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
      const pos = { x: touch.clientX, y: touch.clientY };
      startPos.current = pos;
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        // Clear any iOS native text selection that may have started
        window.getSelection()?.removeAllRanges();
        onLongPress(pos);
      }, LONG_PRESS_DURATION);
    },
    [isEnabled, onLongPress],
  );

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Prevent native context menu on both desktop and mobile
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
    },
    [clear],
  );

  return { onTouchStart, onTouchMove, onTouchEnd, onContextMenu, longPressFired: firedRef };
}
