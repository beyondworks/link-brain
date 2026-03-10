'use client';

import { useCallback, useEffect } from 'react';

const STATUS_BAR_ZONE = 20;

interface UseStatusBarScrollTopOptions {
  isEnabled?: boolean;
  /** CSS selector or ref for the scrollable container */
  containerSelector?: string;
}

/**
 * Tapping the very top of the screen (status bar area, top 20px) scrolls
 * the main content container smoothly back to the top — mimicking the
 * native iOS status-bar-tap behaviour.
 */
export function useStatusBarScrollTop({
  isEnabled = true,
  containerSelector = '#main-content',
}: UseStatusBarScrollTopOptions = {}) {
  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (e.clientY > STATUS_BAR_ZONE) return;

      const container = document.querySelector(containerSelector);
      if (!container) return;

      // Only trigger if content is actually scrolled
      if (container.scrollTop <= 0) return;

      e.preventDefault();
      container.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [containerSelector],
  );

  useEffect(() => {
    if (!isEnabled) return;

    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, [isEnabled, handleClick]);
}
