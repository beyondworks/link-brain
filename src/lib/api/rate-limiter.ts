/**
 * API v1 Rate Limiter
 *
 * Upstash Redis-backed sliding window rate limiting.
 * Falls back to allow-all when UPSTASH env vars are not configured (dev/CI).
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limit configuration by subscription tier
export const RATE_LIMITS = {
  free: {
    requestsPerMinute: 30,
    requestsPerDay: 500,
    aiRequestsPerDay: 5,
  },
  pro: {
    requestsPerMinute: 120,
    requestsPerDay: 5000,
    aiRequestsPerDay: 50,
  },
} as const;

export type SubscriptionTier = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp (seconds)
  retryAfter?: number; // seconds
}

interface TierLimiters {
  minute: Ratelimit;
  day: Ratelimit;
  aiDay: Ratelimit;
}

type LimiterMap = {
  free: TierLimiters;
  pro: TierLimiters;
};

let limiterMap: LimiterMap | null | undefined = undefined;

function createLimiterMap(): LimiterMap | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[RateLimit] UPSTASH_REDIS_REST_URL/TOKEN not configured — rate limiting disabled');
    return null;
  }

  const redis = new Redis({ url, token });

  const make = (tier: SubscriptionTier): TierLimiters => {
    const limits = RATE_LIMITS[tier];
    return {
      minute: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limits.requestsPerMinute, '1 m'),
        prefix: `rl:min:${tier}`,
      }),
      day: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limits.requestsPerDay, '1 d'),
        prefix: `rl:day:${tier}`,
      }),
      aiDay: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limits.aiRequestsPerDay, '1 d'),
        prefix: `rl:ai:${tier}`,
      }),
    };
  };

  return {
    free: make('free'),
    pro: make('pro'),
  };
}

function getLimiterMap(): LimiterMap | null {
  if (limiterMap === undefined) {
    limiterMap = createLimiterMap();
  }
  return limiterMap;
}

/**
 * Check and increment rate limit for a key.
 * Returns RateLimitResult with the same shape as before (resetAt = Unix seconds).
 */
export async function checkRateLimit(
  keyId: string,
  tier: SubscriptionTier,
  isAiRequest: boolean = false
): Promise<RateLimitResult> {
  const map = getLimiterMap();

  // Upstash not configured — allow all (dev/CI)
  if (!map) {
    return {
      allowed: true,
      remaining: 999,
      resetAt: Math.floor(Date.now() / 1000) + 60,
    };
  }

  const limiters = map[tier];

  // Minute window
  const minuteResult = await limiters.minute.limit(keyId);
  if (!minuteResult.success) {
    const resetSec = Math.floor(Number(minuteResult.reset) / 1000);
    const retryAfter = Math.max(0, resetSec - Math.floor(Date.now() / 1000));
    return {
      allowed: false,
      remaining: minuteResult.remaining,
      resetAt: resetSec,
      retryAfter,
    };
  }

  // Day window
  const dayResult = await limiters.day.limit(keyId);
  if (!dayResult.success) {
    const resetSec = Math.floor(Number(dayResult.reset) / 1000);
    const retryAfter = Math.max(0, resetSec - Math.floor(Date.now() / 1000));
    return {
      allowed: false,
      remaining: dayResult.remaining,
      resetAt: resetSec,
      retryAfter,
    };
  }

  // AI day window
  if (isAiRequest) {
    const aiResult = await limiters.aiDay.limit(`ai:${keyId}`);
    if (!aiResult.success) {
      const resetSec = Math.floor(Number(aiResult.reset) / 1000);
      const retryAfter = Math.max(0, resetSec - Math.floor(Date.now() / 1000));
      return {
        allowed: false,
        remaining: aiResult.remaining,
        resetAt: resetSec,
        retryAfter,
      };
    }
  }

  const remaining = Math.min(minuteResult.remaining, dayResult.remaining);
  const resetSec = Math.floor(
    Math.min(Number(minuteResult.reset), Number(dayResult.reset)) / 1000
  );

  return {
    allowed: true,
    remaining,
    resetAt: resetSec,
  };
}

/**
 * Build rate limit headers to add to a NextResponse.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  };

  if (!result.allowed && result.retryAfter !== undefined) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}
