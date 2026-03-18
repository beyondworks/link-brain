'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Hook for initiating Lemon Squeezy checkout.
 * Handles the POST /api/checkout call and redirect.
 */
export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false);

  const checkout = useCallback(async (interval: 'monthly' | 'yearly') => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        if (res.status === 401) {
          window.location.href = '/login?redirect=/pricing';
          return;
        }
        if (res.status === 400 && data.error === 'Already on Pro plan') {
          toast.info('이미 Pro 플랜을 사용 중입니다.');
          return;
        }
        throw new Error(data.error ?? 'Checkout failed');
      }

      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`결제 오류: ${msg}`);
      console.error('[Checkout]', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openPortal = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        if (res.status === 404) {
          toast.info('구독 정보가 없습니다. 관리자 계정이거나 아직 결제 내역이 없습니다.');
          return;
        }
        throw new Error(data.error ?? 'Portal failed');
      }
      const { url } = await res.json() as { url: string };
      window.open(url, '_blank');
    } catch (error) {
      toast.error('구독 관리 페이지를 열 수 없습니다.');
      console.error('[Billing Portal]', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { checkout, openPortal, isLoading };
}
