'use client';

import { useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/ui-store';

/**
 * Pre-computed hex values matching CSS design tokens.
 * Avoids runtime oklch→rgb conversion which is unreliable in PWA environments.
 *
 * bg-background light: oklch(0.985 0.002 250) → #f9fafb
 * bg-background dark:  oklch(0.30 0.00 0)     → #2e2e2e
 *
 * Sidebar and drawer currently use the same bg-background color.
 * If they diverge in the future, add separate entries here.
 */
const COLORS = {
  light: { default: '#f9fafb', sidebar: '#f9fafb', drawer: '#f9fafb' },
  dark: { default: '#2e2e2e', sidebar: '#2e2e2e', drawer: '#2e2e2e' },
} as const;

type OverlayType = 'sidebar' | 'drawer' | 'default';

/**
 * Syncs the iOS PWA status bar color with the current overlay state
 * by updating both the <html> background and theme-color meta tag.
 *
 * Only activates when both conditions are true:
 *   1. Running as installed PWA (display-mode: standalone)
 *   2. On a mobile device (UA sniff + viewport width < 768)
 */
export function useStatusBarSync() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const isChatOpen = useUIStore((s) => s.isChatOpen);
  const peekClipId = useUIStore((s) => s.peekClipId);
  const shouldSyncRef = useRef(false);

  // Detect PWA + mobile on mount
  useEffect(() => {
    const isPWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    const isMobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      window.innerWidth < 768;

    shouldSyncRef.current = isPWA && isMobile;

    if (shouldSyncRef.current) {
      syncStatusBar('default');
    }
  }, []);

  // Sync on overlay state changes
  useEffect(() => {
    if (!shouldSyncRef.current) return;

    if (sidebarOpen) {
      syncStatusBar('sidebar');
    } else if (isChatOpen || peekClipId) {
      syncStatusBar('drawer');
    } else {
      syncStatusBar('default');
    }
  }, [sidebarOpen, isChatOpen, peekClipId]);

  // Watch for theme changes (class mutation on <html> + system color scheme)
  useEffect(() => {
    if (!shouldSyncRef.current) return;

    const getCurrentType = (): OverlayType => {
      const state = useUIStore.getState();
      if (state.sidebarOpen) return 'sidebar';
      if (state.isChatOpen || state.peekClipId) return 'drawer';
      return 'default';
    };

    const observer = new MutationObserver(() => {
      syncStatusBar(getCurrentType());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSchemeChange = () => syncStatusBar(getCurrentType());
    mql.addEventListener('change', handleSchemeChange);

    return () => {
      observer.disconnect();
      mql.removeEventListener('change', handleSchemeChange);
    };
  }, []);
}

// ---------------------------------------------------------------------------

function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

function syncStatusBar(type: OverlayType) {
  const palette = isDarkMode() ? COLORS.dark : COLORS.light;
  const color = palette[type];

  // 1. Update <html> inline background — iOS PWA status bar inherits this
  document.documentElement.style.backgroundColor = color;

  // 2. Update ALL theme-color metas in-place (server may render multiple media-specific ones)
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  if (metas.length) {
    metas.forEach((m) => {
      m.setAttribute('content', color);
      m.removeAttribute('media');
    });
  } else {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = color;
    document.head.appendChild(meta);
  }

  // 3. Update the safe-area-fill element (for black-translucent mode)
  const fill = document.querySelector('[data-status-bar-fill]');
  if (fill instanceof HTMLElement) {
    fill.style.backgroundColor = color;
  }
}
