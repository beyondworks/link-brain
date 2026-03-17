'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Dynamically updates theme-color meta tag when app theme changes.
 * ThemeColorScript handles initial render; this handles runtime changes.
 *
 * Reads the actual computed background color from <html> to ensure
 * the meta tag matches the CSS variable value exactly (no hardcoded hex).
 *
 * NOTE: On PWA mobile, useStatusBarSync takes over and also updates
 * theme-color on overlay state changes. This component provides the
 * baseline for non-PWA environments and marketing pages.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;

    // Read the actual rendered background color (browser resolves oklch → rgb)
    const computed = getComputedStyle(document.documentElement).backgroundColor;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', computed);
      meta.removeAttribute('media');
    } else {
      const el = document.createElement('meta');
      el.name = 'theme-color';
      el.content = computed;
      document.head.appendChild(el);
    }
  }, [resolvedTheme]);

  return null;
}
