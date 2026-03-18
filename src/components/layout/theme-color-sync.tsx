'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Pre-computed hex values matching bg-background CSS tokens.
 * oklch(0.985 0.002 250) → #f9fafb  (light)
 * oklch(0.30 0.00 0)     → #2e2e2e  (dark)
 */
const LIGHT = '#f9fafb';
const DARK = '#2e2e2e';

/**
 * Dynamically updates theme-color meta tag when app theme changes.
 * Uses hardcoded hex values that match bg-background exactly —
 * avoids unreliable getComputedStyle in cross-browser/PWA edge cases.
 *
 * NOTE: On PWA mobile, useStatusBarSync also updates theme-color
 * on overlay state changes. This handles the baseline for all envs.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const color = resolvedTheme === 'dark' ? DARK : LIGHT;

    // Update existing theme-color meta in-place (avoid remove/create flash)
    const existing = document.querySelector('meta[name="theme-color"]');
    if (existing) {
      existing.setAttribute('content', color);
      existing.removeAttribute('media');
    } else {
      const el = document.createElement('meta');
      el.name = 'theme-color';
      el.content = color;
      document.head.appendChild(el);
    }

    // Sync html background to match theme-color exactly (eliminates status bar seam)
    document.documentElement.style.backgroundColor = color;
  }, [resolvedTheme]);

  return null;
}
