'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { isNative } from '@/lib/platform';
import { initDeepLinks, setDeepLinkHandler } from '@/lib/native/deep-links';
import { useUIStore } from '@/stores/ui-store';
import { quickSaveFromClipboard } from '@/lib/utils/quick-save';

export function useDeepLinks() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!isNative) return;

    setDeepLinkHandler((path: string) => {
      // Handle custom deep link actions
      if (path === '/chat' || path === '/quick-ask') {
        useUIStore.getState().openChat();
        return;
      }

      if (path === '/quick-save' || path === '/save-clipboard') {
        // 클립보드에서 URL 읽어 바로 저장, 실패 시 모달 fallback
        quickSaveFromClipboard({
          queryClient: queryClientRef.current,
          onNeedFallback: () => useUIStore.getState().openModal('addClip'),
        });
        return;
      }

      // Widget: tap on recent clip → open peek
      const clipMatch = path.match(/^\/clip\/([a-f0-9-]+)$/);
      if (clipMatch) {
        useUIStore.getState().openClipPeek(clipMatch[1]);
        return;
      }

      // Default: navigate to the path
      router.push(path);
    });

    initDeepLinks().catch(console.warn);
  }, [router]);
}
