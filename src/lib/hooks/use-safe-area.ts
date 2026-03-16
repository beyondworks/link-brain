'use client';

import { useEffect, useState } from 'react';

/**
 * Measures the actual safe-area-inset-top value at runtime
 * and sets it as a CSS variable `--sat` on <html>.
 *
 * This handles cases where `env(safe-area-inset-top)` returns 0
 * (e.g., localhost HTTP, certain browsers, or non-notch devices).
 *
 * All components can use:
 * - inline style: `paddingTop: 'var(--sat, env(safe-area-inset-top, 0px))'`
 * - or just rely on the CSS variable `var(--sat, 0px)`
 */
export function useSafeArea() {
  const [top, setTop] = useState(0);

  useEffect(() => {
    // Measure env(safe-area-inset-top) via a hidden probe element
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;top:0;left:-9999px;visibility:hidden;padding-top:env(safe-area-inset-top,0px)';
    document.body.appendChild(probe);

    const measured = parseFloat(getComputedStyle(probe).paddingTop) || 0;
    document.body.removeChild(probe);

    setTop(measured);

    // Set CSS variable on <html> for global access
    document.documentElement.style.setProperty('--sat', `${measured}px`);
    document.documentElement.style.setProperty(
      '--sab',
      `env(safe-area-inset-bottom, 0px)`
    );
  }, []);

  return { top };
}
