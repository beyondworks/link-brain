'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isNative } from '@/lib/platform';
import { supabase } from '@/lib/supabase/client';

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

/** refreshSession 호출 자체에 대한 안전 캡 (ms) — 갱신 지연이 invalidate를 막지 않도록 */
const SESSION_REFRESH_TIMEOUT_MS = 4_000;

/**
 * 앱 포커스 복귀 시 핵심 쿼리를 선택적으로 무효화하는 통합 훅.
 *
 * - Web/PWA: `visibilitychange` 이벤트
 * - 네이티브(Capacitor): `appStateChange` 이벤트 (+ visibilitychange fallback)
 *
 * iOS WebKit이 백그라운드에서 JS 타이머를 멈추기 때문에
 * Supabase의 autoRefreshToken 인터벌이 동작하지 않는다. 복귀 직후
 * 만료된 액세스 토큰으로 쿼리를 보내면 401이 나거나, 직후 미들웨어가
 * /login으로 리다이렉트해서 강제 로그아웃처럼 보인다.
 * 따라서 invalidate 전에 명시적으로 세션을 갱신한다.
 *
 * 5초 debounce로 빠른 앱 전환 시 중복 요청을 방지한다.
 */
export function useAppFocusRefresh() {
  const queryClient = useQueryClient();
  const lastRefetchRef = useRef(0);

  useEffect(() => {
    const invalidateCore = async () => {
      const now = Date.now();
      if (now - lastRefetchRef.current < MIN_REFETCH_INTERVAL) return;
      lastRefetchRef.current = now;

      // 1. 세션 먼저 갱신 — 백그라운드 동안 만료됐을 수 있음.
      //    실패해도 silently continue: 다음 요청에서 401이 나면 그때 처리.
      try {
        await Promise.race([
          supabase.auth.refreshSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('REFRESH_TIMEOUT')), SESSION_REFRESH_TIMEOUT_MS)
          ),
        ]);
      } catch {
        // ignore — invalidate는 진행
      }

      // 2. 쿼리 무효화
      for (const key of FOCUS_INVALIDATION_KEYS) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    };

    // Web/PWA: visibilitychange (네이티브에서도 fallback으로 동작)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void invalidateCore();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // 네이티브: Capacitor App.addListener('appStateChange')
    let removeNativeListener: (() => void) | null = null;

    if (isNative) {
      import('@capacitor/app').then(({ App }) => {
        const listener = App.addListener('appStateChange', (state) => {
          if (state.isActive) {
            void invalidateCore();
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
