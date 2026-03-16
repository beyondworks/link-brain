'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Syncs the <meta name="theme-color"> tag with the app's current theme.
 *
 * iOS Safari uses theme-color for the status bar background.
 * Without this, the status bar uses the static meta tag value which may
 * not match the app's actual theme (e.g., system dark + app light).
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Match the actual --background CSS value for each theme
    const color = resolvedTheme === 'dark' ? '#2e2e2e' : '#fafafa';

    // Find or create the theme-color meta tags and update them all
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    if (metas.length > 0) {
      metas.forEach((meta) => {
        meta.setAttribute('content', color);
        // Remove media attribute so it applies unconditionally
        meta.removeAttribute('media');
      });
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = color;
      document.head.appendChild(meta);
    }
  }, [resolvedTheme]);

  return null;
}
