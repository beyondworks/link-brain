'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Syncs <meta name="theme-color"> with the ACTUAL computed background color.
 *
 * Instead of hardcoding hex values (which may not exactly match oklch CSS variables),
 * reads the computed background-color from document.body and uses that exact value.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Wait for theme to be applied to DOM
    requestAnimationFrame(() => {
      // Read the ACTUAL computed background color from body
      const computed = getComputedStyle(document.body).backgroundColor;

      // Convert rgb(r, g, b) to #rrggbb
      const match = computed.match(/\d+/g);
      let hex: string;
      if (match && match.length >= 3) {
        hex = '#' + match.slice(0, 3).map((v) => parseInt(v).toString(16).padStart(2, '0')).join('');
      } else {
        // Fallback
        hex = resolvedTheme === 'dark' ? '#2e2e2e' : '#fafafa';
      }

      // Update all theme-color meta tags
      const metas = document.querySelectorAll('meta[name="theme-color"]');
      metas.forEach((meta) => {
        meta.setAttribute('content', hex);
        meta.removeAttribute('media');
      });

      // If no meta tag exists, create one
      if (metas.length === 0) {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = hex;
        document.head.appendChild(meta);
      }
    });
  }, [resolvedTheme]);

  return null;
}
