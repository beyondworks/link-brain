'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const HIDE_THRESHOLD = 10;
const SHOW_THRESHOLD = 5;

interface UseScrollDirectionOptions {
  isEnabled?: boolean;
  scrollContainerId?: string;
}

/**
 * Tracks scroll direction on #main-content to control mobile header visibility.
 * Shows header at top/bottom of scroll, hides on scroll-down, shows on scroll-up.
 */
export function useScrollDirection({
  isEnabled = true,
  scrollContainerId = 'main-content',
}: UseScrollDirectionOptions = {}) {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  const showHeader = useCallback(() => {
    setIsHeaderVisible(true);
    lastScrollYRef.current = 0;
  }, []);

  // Listen for custom event from bottom nav tab re-click
  useEffect(() => {
    if (!isEnabled) return;

    const handleShowHeader = () => showHeader();

    window.addEventListener('show-mobile-header', handleShowHeader);
    return () => window.removeEventListener('show-mobile-header', handleShowHeader);
  }, [isEnabled, showHeader]);

  // Main scroll listener
  useEffect(() => {
    if (!isEnabled) return;

    const container = document.getElementById(scrollContainerId);
    if (!container) return;

    function handleScroll() {
      if (tickingRef.current) return;

      requestAnimationFrame(() => {
        const currentScrollY = container!.scrollTop;
        const delta = currentScrollY - lastScrollYRef.current;
        const isAtBottom =
          currentScrollY + container!.clientHeight >=
          container!.scrollHeight - 10;
        const isAtTop = currentScrollY <= 0;

        if (isAtTop || isAtBottom) {
          setIsHeaderVisible(true);
        } else if (delta > HIDE_THRESHOLD) {
          setIsHeaderVisible(false);
        } else if (delta < -SHOW_THRESHOLD) {
          setIsHeaderVisible(true);
        }

        lastScrollYRef.current = currentScrollY;
        tickingRef.current = false;
      });

      tickingRef.current = true;
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isEnabled, scrollContainerId]);

  return { isHeaderVisible, showHeader };
}
