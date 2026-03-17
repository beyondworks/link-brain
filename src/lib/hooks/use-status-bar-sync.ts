'use client';

import { useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/ui-store';

/**
 * Syncs the <html> background color, safe-area-fill element, AND
 * meta[name="theme-color"] with the current overlay state so the iOS PWA
 * status bar area seamlessly matches the visible surface.
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

    const getCurrentType = (): 'sidebar' | 'drawer' | 'default' => {
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

const VAR_MAP: Record<string, string> = {
  sidebar: '--sidebar-bg',
  drawer: '--drawer-bg',
  default: '--app-bg',
};

function getThemeVar(varName: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}

function syncStatusBar(type: 'sidebar' | 'drawer' | 'default') {
  const color = getThemeVar(VAR_MAP[type]);
  if (!color) return;

  // 1. Update <html> background — iOS PWA status bar inherits this
  document.documentElement.style.backgroundColor = color;

  // 2. Read back the computed rgb value (browser converts oklch → rgb)
  //    and update the theme-color meta tag with a browser-compatible value
  const computedRgb = getComputedStyle(document.documentElement).backgroundColor;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', computedRgb);
    meta.removeAttribute('media');
  }

  // 3. Update the safe-area-fill element so the notch cover matches
  const fill = document.querySelector('[data-status-bar-fill]');
  if (fill instanceof HTMLElement) {
    fill.style.backgroundColor = color;
  }
}
