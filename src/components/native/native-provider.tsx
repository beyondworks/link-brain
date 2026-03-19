'use client';

import { useEffect, useState } from 'react';
import { isNative } from '@/lib/platform';

export function NativeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!isNative) return;

    // Add native-app class to html element
    document.documentElement.classList.add('native-app');

    // Disable context menu on native (long press is custom)
    const preventContextMenu = (e: Event) => {
      const target = e.target as HTMLElement;
      // Allow context menu on text inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
    };
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.documentElement.classList.remove('native-app');
    };
  }, []);

  if (!mounted) return null;
  return <>{children}</>;
}
