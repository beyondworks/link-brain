/**
 * Plan Enforcement Service
 *
 * Server-side plan limit checks for clips, collections, API keys, and AI credits.
 * All limits are defined in src/config/credits.ts (PLAN_LIMITS).
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  PLAN_LIMITS,
  CREDIT_COSTS,
  serializeLimit,
  hasFeature,
  type PlanTier,
  type CreditAction,
  type Feature,
} from '@/config/credits';

const db = supabaseAdmin;

export interface PlanStatus {
  tier: PlanTier;
  clips: { used: number; limit: number };
  collections: { used: number; limit: number };
  apiKeys: { used: number; limit: number };
  aiCredits: { used: number; limit: number };
  studioGenerations: { used: number; limit: number };
  resetAt: string;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  used?: number;
  limit?: number;
}

function getMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function getMonthEnd(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

/** Resolve user's plan tier from public.users.plan column */
export async function getUserPlan(publicUserId: string): Promise<PlanTier> {
  try {
    const { data } = await db
      .from('users')
      .select('plan')
      .eq('id', publicUserId)
      .single();

    if (data?.plan && data.plan in PLAN_LIMITS) {
      return data.plan as PlanTier;
    }
  } catch {
    // fallback
  }
  return 'free';
}

/** Get full plan status for a user */
export async function getPlanStatus(publicUserId: string): Promise<PlanStatus> {
  const monthStart = getMonthStart();

  const [tier, clipsCount, collectionsCount, apiKeysCount, creditUsage, studioUsage] =
    await Promise.all([
      getUserPlan(publicUserId),
      db
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', publicUserId)
        .eq('is_archived', false),
      db
        .from('collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', publicUserId),
      db
        .from('api_keys')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', publicUserId),
      db
        .from('credit_usage')
        .select('cost')
        .eq('user_id', publicUserId)
        .gte('created_at', monthStart),
      db
        .from('credit_usage')
        .select('cost')
        .eq('user_id', publicUserId)
        .eq('action', 'AI_STUDIO')
        .gte('created_at', monthStart),
    ]);

  const limits = PLAN_LIMITS[tier];
  const totalCreditsUsed = (creditUsage.data ?? []).reduce(
    (sum: number, row: { cost: number }) => sum + row.cost,
    0
  );
  const totalStudioUsed = (studioUsage.data ?? []).reduce(
    (sum: number, row: { cost: number }) => sum + row.cost,
    0
  );

  return {
    tier,
    clips: {
      used: clipsCount.count ?? 0,
      limit: serializeLimit(limits.maxClips),
    },
    collections: {
      used: collectionsCount.count ?? 0,
      limit: serializeLimit(limits.maxCollections),
    },
    apiKeys: {
      used: apiKeysCount.count ?? 0,
      limit: serializeLimit(limits.maxApiKeys),
    },
    aiCredits: {
      used: totalCreditsUsed,
      limit: serializeLimit(limits.monthlyAiCredits),
    },
    studioGenerations: {
      used: totalStudioUsed,
      limit: serializeLimit(limits.monthlyStudioGenerations),
    },
    resetAt: getMonthEnd(),
  };
}

/** Check if user can create a new clip */
export async function checkClipLimit(publicUserId: string): Promise<LimitCheckResult> {
  const tier = await getUserPlan(publicUserId);
  const maxClips = PLAN_LIMITS[tier].maxClips;

  if (maxClips === Infinity) return { allowed: true };

  const { count } = await db
    .from('clips')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', publicUserId)
    .eq('is_archived', false);

  const used = count ?? 0;
  if (used >= maxClips) {
    return {
      allowed: false,
      reason: 'CLIP_LIMIT_REACHED',
      used,
      limit: maxClips,
    };
  }
  return { allowed: true, used, limit: maxClips };
}

/** Check if user can create a new collection */
export async function checkCollectionLimit(publicUserId: string): Promise<LimitCheckResult> {
  const tier = await getUserPlan(publicUserId);
  const maxCollections = PLAN_LIMITS[tier].maxCollections;

  if (maxCollections === Infinity) return { allowed: true };

  const { count } = await db
    .from('collections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', publicUserId);

  const used = count ?? 0;
  if (used >= maxCollections) {
    return {
      allowed: false,
      reason: 'COLLECTION_LIMIT_REACHED',
      used,
      limit: maxCollections,
    };
  }
  return { allowed: true, used, limit: maxCollections };
}

/** Check if user can create a new API key */
export async function checkApiKeyLimit(publicUserId: string): Promise<LimitCheckResult> {
  const tier = await getUserPlan(publicUserId);
  const maxKeys = PLAN_LIMITS[tier].maxApiKeys;

  if (maxKeys === Infinity) return { allowed: true };

  const { count } = await db
    .from('api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', publicUserId);

  const used = count ?? 0;
  if (used >= maxKeys) {
    return {
      allowed: false,
      reason: 'API_KEY_LIMIT_REACHED',
      used,
      limit: maxKeys,
    };
  }
  return { allowed: true, used, limit: maxKeys };
}

/** Check and deduct AI credits */
export async function deductCredits(
  publicUserId: string,
  action: CreditAction,
  clipId?: string
): Promise<LimitCheckResult> {
  const cost = CREDIT_COSTS[action];
  if (cost === 0) return { allowed: true };

  const tier = await getUserPlan(publicUserId);
  const monthlyLimit = PLAN_LIMITS[tier].monthlyAiCredits;

  // Unlimited — insert directly, no limit check needed
  if (monthlyLimit === Infinity) {
    await db.from('credit_usage').insert({
      user_id: publicUserId,
      action,
      cost,
      clip_id: clipId ?? null,
    });
    return { allowed: true };
  }

  // Check studio-specific limit before attempting deduction
  if (action === 'AI_STUDIO') {
    const studioLimit = PLAN_LIMITS[tier].monthlyStudioGenerations;
    if (studioLimit !== Infinity) {
      const monthStart = getMonthStart();
      const { data: studioRows } = await db
        .from('credit_usage')
        .select('cost')
        .eq('user_id', publicUserId)
        .eq('action', 'AI_STUDIO')
        .gte('created_at', monthStart);

      const studioUsed = (studioRows ?? []).reduce(
        (sum: number, row: { cost: number }) => sum + row.cost,
        0
      );

      if (studioUsed + cost > studioLimit) {
        return {
          allowed: false,
          reason: 'STUDIO_LIMIT_REACHED',
          used: studioUsed,
          limit: studioLimit,
        };
      }
    }
  }

  // Atomic deduction via SQL function (prevents TOCTOU race condition).
  // deduct_credit() checks the limit and inserts in a single transaction.
  // Pass monthlyLimit from TypeScript config → single source of truth.
  const { data: rpcResult, error: rpcError } = await db.rpc('deduct_credit', {
    p_user_id: publicUserId,
    p_action: action,
    p_cost: cost,
    p_clip_id: clipId ?? undefined,
    p_monthly_limit: monthlyLimit,
  });

  if (rpcError) {
    console.error('[deductCredits] rpc error:', rpcError);
    return {
      allowed: false,
      reason: 'INSUFFICIENT_CREDITS',
      used: 0,
      limit: monthlyLimit,
    };
  }

  const result = rpcResult as { allowed: boolean; used: number; limit: number } | null;

  if (!result || !result.allowed) {
    return {
      allowed: false,
      reason: 'INSUFFICIENT_CREDITS',
      used: result?.used ?? 0,
      limit: result?.limit ?? monthlyLimit,
    };
  }

  return {
    allowed: true,
    used: result.used,
    limit: result.limit,
  };
}

/** Check if user's plan includes a feature */
export async function checkFeatureAccess(
  publicUserId: string,
  feature: Feature
): Promise<LimitCheckResult> {
  const tier = await getUserPlan(publicUserId);
  if (hasFeature(tier, feature)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: 'FEATURE_NOT_AVAILABLE',
  };
}
