'use client';

import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/lib/hooks/use-plan';
import { useCheckout } from '@/lib/hooks/use-checkout';

/**
 * Contextual upgrade banner for Free users.
 * Shows when credits are below threshold or clip limit is approaching.
 */
export function UpgradeBanner() {
  const { isFree, usage } = usePlan();
  const { checkout, isLoading } = useCheckout();

  if (!isFree || !usage) return null;

  // Determine which limit is approaching
  const creditPercent = usage.creditsLimit > 0
    ? (usage.creditsUsed / usage.creditsLimit) * 100
    : 0;
  const clipPercent = usage.clipsLimit > 0
    ? (usage.clipsUsed / usage.clipsLimit) * 100
    : 0;

  const isLowCredits = creditPercent >= 80;
  const isLowClips = clipPercent >= 80;

  // Only show when a limit is approaching
  if (!isLowCredits && !isLowClips) return null;

  const message = isLowClips
    ? `클립 ${usage.clipsUsed}/${usage.clipsLimit}개 사용 중 — Pro로 무제한 저장하세요`
    : `AI 크레딧 ${usage.creditsUsed}/${usage.creditsLimit}회 사용 — Pro로 5배 더 사용하세요`;

  return (
    <div className="animate-fade-in-up mb-6 flex items-center gap-3 rounded-xl border border-primary/20 bg-brand-muted px-4 py-3">
      <Sparkles className="h-4 w-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-sm text-foreground">
        {message}
      </p>
      <Button
        size="sm"
        className="shrink-0 gap-1.5 rounded-lg"
        onClick={() => checkout('monthly')}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            업그레이드
            <ArrowRight className="h-3.5 w-3.5" />
          </>
        )}
      </Button>
    </div>
  );
}
