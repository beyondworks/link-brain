'use client';

import { useRef, useCallback, useState, useEffect } from 'react';

const THRESHOLD = 80;
const MAX_PULL = 120;
const RESISTANCE = 0.4;

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<unknown>;
  isEnabled?: boolean;
  containerRef?: React.RefObject<HTMLElement | null>;
}

interface PullToRefreshState {
  pullDistance: number;
  isRefreshing: boolean;
  isPulling: boolean;
}

export function usePullToRefresh({
  onRefresh,
  isEnabled = true,
  containerRef,
}: UsePullToRefreshOptions): PullToRefreshState {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!isEnabled || isRefreshing) return;

      const container = containerRef?.current;
      const scrollTop = container ? container.scrollTop : 0;

      if (scrollTop > 0) return;

      startY.current = e.touches[0].clientY;
      pulling.current = false;
    },
    [isEnabled, isRefreshing, containerRef],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isEnabled || isRefreshing) return;

      const container = containerRef?.current;
      const scrollTop = container ? container.scrollTop : 0;

      if (scrollTop > 0) {
        if (pulling.current) {
          pulling.current = false;
          setIsPulling(false);
          setPullDistance(0);
        }
        return;
      }

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      if (diff <= 0) {
        if (pulling.current) {
          pulling.current = false;
          setIsPulling(false);
          setPullDistance(0);
        }
        return;
      }

      if (!pulling.current) {
        pulling.current = true;
        setIsPulling(true);
        startY.current = currentY.current;
        return;
      }

      e.preventDefault();

      const distance = Math.min(diff * RESISTANCE, MAX_PULL);
      setPullDistance(distance);
    },
    [isEnabled, isRefreshing, containerRef],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || isRefreshing) {
      setPullDistance(0);
      setIsPulling(false);
      pulling.current = false;
      return;
    }

    pulling.current = false;
    setIsPulling(false);

    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef?.current;
    if (!container || !isEnabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerRef, isEnabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing, isPulling };
}
