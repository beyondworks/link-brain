'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useUIStore } from '@/stores/ui-store';

/**
 * Syncs <meta name="theme-color"> with the app state.
 *
 * - Default: matches the computed bg-background color
 * - When notchOverlayActive: blends bg-background with black/50 overlay
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();
  const notchOverlayActive = useUIStore((s) => s.notchOverlayActive);

  useEffect(() => {
    // Wait for theme to be applied to DOM
    requestAnimationFrame(() => {
      const computed = getComputedStyle(document.body).backgroundColor;
      const match = computed.match(/\d+/g);

      let r: number, g: number, b: number;
      if (match && match.length >= 3) {
        r = parseInt(match[0]);
        g = parseInt(match[1]);
        b = parseInt(match[2]);
      } else {
        // Fallback
        if (resolvedTheme === 'dark') {
          r = 63; g = 63; b = 63;
        } else {
          r = 249; g = 250; b = 251;
        }
      }

      // When overlay is active, blend with black at 50% opacity
      if (notchOverlayActive) {
        r = Math.round(r * 0.5);
        g = Math.round(g * 0.5);
        b = Math.round(b * 0.5);
      }

      const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

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
  }, [resolvedTheme, notchOverlayActive]);

  return null;
}
