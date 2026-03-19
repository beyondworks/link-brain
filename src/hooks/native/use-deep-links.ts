'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isNative } from '@/lib/platform';
import { initDeepLinks, setDeepLinkHandler } from '@/lib/native/deep-links';
import { useUIStore } from '@/stores/ui-store';

export function useDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    if (!isNative) return;

    setDeepLinkHandler((path: string) => {
      // Handle custom deep link actions
      if (path === '/chat' || path === '/quick-ask') {
        useUIStore.getState().openChat();
        return;
      }

      if (path === '/quick-save') {
        useUIStore.getState().openModal('addClip');
        return;
      }

      // Default: navigate to the path
      router.push(path);
    });

    initDeepLinks().catch(console.warn);
  }, [router]);
}
