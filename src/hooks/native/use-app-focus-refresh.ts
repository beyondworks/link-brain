'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isNative } from '@/lib/platform';

/**
 * 핵심 쿼리 키 — 포커스 복귀 시 선택적으로 무효화할 대상.
 * 무거운 통계(dashboard-stats, weekly-stats 등)는 제외하여
 * 네트워크 부하를 최소화한다.
 */
const FOCUS_INVALIDATION_KEYS = [
  'clips',
  'nav-counts',
  'categories',
  'collections',
] as const;

/** 재요청 방지 최소 간격 (ms) */
const MIN_REFETCH_INTERVAL = 5_000;

/**
 * 앱 포커스 복귀 시 핵심 쿼리를 선택적으로 무효화하는 통합 훅.
 *
 * - Web/PWA: `visibilitychange` 이벤트
 * - 네이티브(Capacitor): `appStateChange` 이벤트 (+ visibilitychange fallback)
 *
 * 5초 debounce로 빠른 앱 전환 시 중복 요청을 방지한다.
 */
export function useAppFocusRefresh() {
  const queryClient = useQueryClient();
  const lastRefetchRef = useRef(0);

  useEffect(() => {
    const invalidateCore = () => {
      const now = Date.now();
      if (now - lastRefetchRef.current < MIN_REFETCH_INTERVAL) return;
      lastRefetchRef.current = now;

      for (const key of FOCUS_INVALIDATION_KEYS) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    };

    // Web/PWA: visibilitychange (네이티브에서도 fallback으로 동작)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        invalidateCore();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // 네이티브: Capacitor App.addListener('appStateChange')
    let removeNativeListener: (() => void) | null = null;

    if (isNative) {
      import('@capacitor/app').then(({ App }) => {
        const listener = App.addListener('appStateChange', (state) => {
          if (state.isActive) {
            invalidateCore();
          }
        });
        // Capacitor addListener는 PluginListenerHandle (Promise<> wrapper)
        listener.then((handle) => {
          removeNativeListener = () => handle.remove();
        });
      }).catch(() => {
        // Capacitor 미설치 환경 — visibilitychange fallback만 사용
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      removeNativeListener?.();
    };
  }, [queryClient]);
}
