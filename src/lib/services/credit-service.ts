/**
 * Credit Service
 *
 * Thin wrapper around plan-service for backward compatibility.
 * New code should use plan-service directly.
 */

import { getPlanStatus, type PlanStatus } from '@/lib/services/plan-service';

export interface CreditBalance {
  userId: string;
  tier: string;
  creditsUsed: number;
  creditsLimit: number; // -1 = unlimited
  studioUsed: number;
  studioLimit: number; // -1 = unlimited
  clipsUsed: number;
  clipsLimit: number; // -1 = unlimited
  collectionsUsed: number;
  collectionsLimit: number; // -1 = unlimited
  apiKeysUsed: number;
  apiKeysLimit: number; // -1 = unlimited
  resetAt: string;
}

/**
 * Get full credit balance for a user (public user ID).
 */
export async function getCreditBalance(publicUserId: string): Promise<CreditBalance> {
  const status: PlanStatus = await getPlanStatus(publicUserId);

  return {
    userId: publicUserId,
    tier: status.tier,
    creditsUsed: status.aiCredits.used,
    creditsLimit: status.aiCredits.limit,
    studioUsed: status.studioGenerations.used,
    studioLimit: status.studioGenerations.limit,
    clipsUsed: status.clips.used,
    clipsLimit: status.clips.limit,
    collectionsUsed: status.collections.used,
    collectionsLimit: status.collections.limit,
    apiKeysUsed: status.apiKeys.used,
    apiKeysLimit: status.apiKeys.limit,
    resetAt: status.resetAt,
  };
}
