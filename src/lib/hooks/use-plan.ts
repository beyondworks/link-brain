'use client';

import { useCredits } from '@/lib/hooks/use-credits';
import type { CreditBalance } from '@/lib/services/credit-service';

export type PlanTier = 'free' | 'pro';

function canUse(used: number, limit: number): boolean {
  if (limit === -1) return true;
  return used < limit;
}

export function usePlan() {
  const { data: usage, isLoading } = useCredits();

  const tier = (usage?.tier ?? 'free') as PlanTier;

  return {
    tier,
    isPro: tier === 'pro',
    isFree: tier === 'free',
    canCreateClip: usage ? canUse(usage.clipsUsed, usage.clipsLimit) : true,
    canCreateCollection: usage ? canUse(usage.collectionsUsed, usage.collectionsLimit) : true,
    canUseAi: usage ? canUse(usage.creditsUsed, usage.creditsLimit) : true,
    canUseStudio: usage ? canUse(usage.studioUsed, usage.studioLimit) : true,
    usage: usage as CreditBalance | undefined,
    isLoading,
  };
}
