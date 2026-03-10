'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const EDGE_ZONE = 20;
const SWIPE_THRESHOLD = 80;
const MAX_SWIPE = 160;
const RESISTANCE = 0.45;

interface EdgeSwipeState {
  /** Current horizontal swipe offset in px (positive = right / back, negative = left / forward) */
  swipeOffset: number;
  /** Which edge is being swiped */
  activeEdge: 'left' | 'right' | null;
  /** Whether a navigation is currently animating */
  isNavigating: boolean;
}

interface UseEdgeSwipeNavigationOptions {
  isEnabled?: boolean;
}

export function useEdgeSwipeNavigation({
  isEnabled = true,
}: UseEdgeSwipeNavigationOptions = {}): EdgeSwipeState {
  const router = useRouter();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [activeEdge, setActiveEdge] = useState<'left' | 'right' | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const edge = useRef<'left' | 'right' | null>(null);
  const isTracking = useRef(false);
  const directionLocked = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!isEnabled || isNavigating) return;

      const x = e.touches[0].clientX;
      const screenWidth = window.innerWidth;

      if (x <= EDGE_ZONE) {
        edge.current = 'left';
      } else if (x >= screenWidth - EDGE_ZONE) {
        edge.current = 'right';
      } else {
        edge.current = null;
        return;
      }

      startX.current = x;
      startY.current = e.touches[0].clientY;
      isTracking.current = true;
      directionLocked.current = false;
    },
    [isEnabled, isNavigating],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isTracking.current || !edge.current) return;

      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      // Lock direction after initial movement
      if (!directionLocked.current) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

        // If vertical scroll dominates, cancel swipe
        if (Math.abs(dy) > Math.abs(dx)) {
          isTracking.current = false;
          edge.current = null;
          return;
        }
        directionLocked.current = true;
      }

      // Left edge: only allow swipe right (back)
      if (edge.current === 'left' && dx <= 0) {
        setSwipeOffset(0);
        return;
      }
      // Right edge: only allow swipe left (forward)
      if (edge.current === 'right' && dx >= 0) {
        setSwipeOffset(0);
        return;
      }

      e.preventDefault();

      const absDx = Math.abs(dx);
      const distance = Math.min(absDx * RESISTANCE, MAX_SWIPE);
      const signedDistance = edge.current === 'left' ? distance : -distance;

      setSwipeOffset(signedDistance);
      setActiveEdge(edge.current);
    },
    [],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isTracking.current || !edge.current) {
      setSwipeOffset(0);
      setActiveEdge(null);
      return;
    }

    const absDist = Math.abs(swipeOffset);
    const currentEdge = edge.current;

    isTracking.current = false;
    edge.current = null;

    if (absDist >= SWIPE_THRESHOLD * RESISTANCE) {
      setIsNavigating(true);
      // Animate out
      setSwipeOffset(currentEdge === 'left' ? MAX_SWIPE : -MAX_SWIPE);

      setTimeout(() => {
        if (currentEdge === 'left') {
          router.back();
        } else {
          router.forward();
        }
        setSwipeOffset(0);
        setActiveEdge(null);
        setIsNavigating(false);
      }, 200);
    } else {
      setSwipeOffset(0);
      setActiveEdge(null);
    }
  }, [swipeOffset, router]);

  useEffect(() => {
    if (!isEnabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isEnabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { swipeOffset, activeEdge, isNavigating };
}
