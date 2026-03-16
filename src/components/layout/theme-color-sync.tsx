'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const LIGHT = '#ffffff';
const DARK = '#363636';

/**
 * Dynamically updates theme-color meta tag when app theme changes.
 * ThemeColorScript handles initial render; this handles runtime changes.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const color = resolvedTheme === 'dark' ? DARK : LIGHT;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', color);
      meta.removeAttribute('media');
    } else {
      const el = document.createElement('meta');
      el.name = 'theme-color';
      el.content = color;
      document.head.appendChild(el);
    }
  }, [resolvedTheme]);

  return null;
}
