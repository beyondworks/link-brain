/**
 * Credit Service
 *
 * Tracks AI usage credits per user based on subscription tier.
 * Credit limits are defined in src/config/credits.ts (PLAN_LIMITS).
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { PLAN_LIMITS, type PlanTier } from '@/config/credits';

export interface CreditBalance {
  userId: string;
  tier: PlanTier;
  creditsUsed: number;
  creditsLimit: number; // Infinity encoded as -1 in JSON
  resetAt: string; // ISO date of next monthly reset
}

export interface CreditAvailability {
  allowed: boolean;
  remaining: number; // -1 = unlimited
  limit: number; // -1 = unlimited
}

function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function getMonthEnd(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

/**
 * Resolve a user's subscription tier from their auth UID.
 * Mirrors the logic in src/lib/api/middleware.ts getUserTier().
 * Falls back to 'free' on any error or missing data.
 */
async function getUserTier(authUserId: string): Promise<PlanTier> {
  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', authUserId)
      .single();

    if (sub && typeof sub === 'object' && 'tier' in sub && 'status' in sub) {
      const tier = (sub as { tier: string; status: string }).tier as PlanTier;
      const status = (sub as { tier: string; status: string }).status;
      if (status === 'active' && tier in PLAN_LIMITS) {
        return tier;
      }
    }
  } catch {
    // Graceful fallback — subscriptions table may not exist yet
  }

  return 'free';
}

/**
 * Count AI credit usage this month by counting clips with AI-generated summaries.
 * Each clip analyzed costs CREDIT_COSTS.AI_SUMMARY (1 credit) at minimum.
 */
async function getMonthlyUsage(authUserId: string): Promise<number> {
  const monthStart = getMonthStart();

  try {
    // Count clips created this month that have an AI-generated summary
    const { count } = await supabaseAdmin
      .from('clips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authUserId)
      .gte('created_at', monthStart)
      .not('summary', 'is', null);

    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Get full credit balance for a user.
 */
export async function getCreditBalance(authUserId: string): Promise<CreditBalance> {
  const [tier, creditsUsed] = await Promise.all([
    getUserTier(authUserId),
    getMonthlyUsage(authUserId),
  ]);

  const monthlyCredits = PLAN_LIMITS[tier].monthlyCredits;
  // Infinity cannot be serialized to JSON — encode as -1
  const creditsLimit = monthlyCredits === Infinity ? -1 : monthlyCredits;

  return {
    userId: authUserId,
    tier,
    creditsUsed,
    creditsLimit,
    resetAt: getMonthEnd(),
  };
}

/**
 * Check whether a user has credits available for a given cost.
 * @param cost - Number of credits the action will consume
 */
export async function checkCreditAvailable(
  authUserId: string,
  cost: number
): Promise<CreditAvailability> {
  const balance = await getCreditBalance(authUserId);

  // Unlimited tier
  if (balance.creditsLimit === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  const remaining = balance.creditsLimit - balance.creditsUsed;
  return {
    allowed: remaining >= cost,
    remaining,
    limit: balance.creditsLimit,
  };
}
