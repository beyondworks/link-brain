'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { isNative } from '@/lib/platform';

export function useNativeStatusBar() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!isNative) return;

    const initStatusBar = async () => {
      const { StatusBar, Style } = await import('@capacitor/status-bar');

      await StatusBar.setStyle({
        style: resolvedTheme === 'dark' ? Style.Dark : Style.Light,
      });

      // Make status bar overlay the WebView (iOS default with Capacitor)
      await StatusBar.setOverlaysWebView({ overlay: true });
    };

    initStatusBar().catch(console.warn);
  }, [resolvedTheme]);
}
