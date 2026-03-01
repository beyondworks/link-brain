/**
 * API v1 Rate Limiter
 *
 * In-memory rate limiting with per-key sliding window counters.
 * Tracks usage per API key with tier-based limits.
 */

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
  master: {
    requestsPerMinute: 240,
    requestsPerDay: 100000,
    aiRequestsPerDay: 1000,
  },
} as const;

export type SubscriptionTier = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp
  retryAfter?: number; // seconds
}

interface WindowEntry {
  count: number;
  windowStart: number; // ms timestamp
}

// In-memory stores (per-process; resets on cold start)
const minuteWindows = new Map<string, WindowEntry>();
const dayWindows = new Map<string, WindowEntry>();
const aiDayWindows = new Map<string, WindowEntry>();

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function getWindow(
  store: Map<string, WindowEntry>,
  key: string,
  windowMs: number
): WindowEntry {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    const fresh: WindowEntry = { count: 0, windowStart: now };
    store.set(key, fresh);
    return fresh;
  }

  return entry;
}

function secondsUntilWindowReset(entry: WindowEntry, windowMs: number): number {
  const resetAt = entry.windowStart + windowMs;
  return Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
}

/**
 * Check and increment rate limit for an API key.
 */
export function checkRateLimit(
  keyId: string,
  tier: SubscriptionTier,
  isAiRequest: boolean = false
): RateLimitResult {
  const limits = RATE_LIMITS[tier];

  // Minute window
  const minuteKey = `min:${keyId}`;
  const minuteEntry = getWindow(minuteWindows, minuteKey, MINUTE_MS);

  if (minuteEntry.count >= limits.requestsPerMinute) {
    const retryAfter = secondsUntilWindowReset(minuteEntry, MINUTE_MS);
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.floor((minuteEntry.windowStart + MINUTE_MS) / 1000),
      retryAfter,
    };
  }

  // Day window
  const dayKey = `day:${keyId}`;
  const dayEntry = getWindow(dayWindows, dayKey, DAY_MS);

  if (dayEntry.count >= limits.requestsPerDay) {
    const retryAfter = secondsUntilWindowReset(dayEntry, DAY_MS);
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.floor((dayEntry.windowStart + DAY_MS) / 1000),
      retryAfter,
    };
  }

  // AI day window
  if (isAiRequest) {
    const aiKey = `ai:${keyId}`;
    const aiEntry = getWindow(aiDayWindows, aiKey, DAY_MS);

    if (aiEntry.count >= limits.aiRequestsPerDay) {
      const retryAfter = secondsUntilWindowReset(aiEntry, DAY_MS);
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.floor((aiEntry.windowStart + DAY_MS) / 1000),
        retryAfter,
      };
    }

    aiEntry.count++;
  }

  // Increment counters
  minuteEntry.count++;
  dayEntry.count++;

  const remaining = Math.max(0, limits.requestsPerDay - dayEntry.count);

  return {
    allowed: true,
    remaining,
    resetAt: Math.floor((dayEntry.windowStart + DAY_MS) / 1000),
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
