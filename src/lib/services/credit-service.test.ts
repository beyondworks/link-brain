import { vi, describe, it, expect, beforeEach } from 'vitest';

// Must be hoisted before importing the module under test
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCreditBalance, checkCreditAvailable } from './credit-service';

// Helper: build a chainable Supabase query mock that resolves to `result`
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'gte', 'not', 'single'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // The final awaited value
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;

describe('getCreditBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns free tier defaults when subscription not found', async () => {
    // subscriptions query → no data (user not found)
    // clips count query → 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return makeChain({ data: null, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: 0, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const balance = await getCreditBalance('user-123');

    expect(balance.userId).toBe('user-123');
    expect(balance.tier).toBe('free');
    expect(balance.creditsUsed).toBe(0);
    expect(balance.creditsLimit).toBe(50); // PLAN_LIMITS.free.monthlyCredits
    expect(typeof balance.resetAt).toBe('string');
  });

  it('returns correct limits for pro tier with active subscription', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return makeChain({ data: { tier: 'pro', status: 'active' }, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: 42, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const balance = await getCreditBalance('user-pro');

    expect(balance.tier).toBe('pro');
    expect(balance.creditsLimit).toBe(1000); // PLAN_LIMITS.pro.monthlyCredits
    expect(balance.creditsUsed).toBe(42);
  });

  it('falls back to free tier when subscription status is not active', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return makeChain({ data: { tier: 'pro', status: 'cancelled' }, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: 5, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const balance = await getCreditBalance('user-cancelled');

    expect(balance.tier).toBe('free');
    expect(balance.creditsLimit).toBe(50);
  });

  it('encodes Infinity as -1 for master tier', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return makeChain({ data: { tier: 'master', status: 'active' }, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: 999, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const balance = await getCreditBalance('user-master');

    expect(balance.tier).toBe('master');
    expect(balance.creditsLimit).toBe(-1); // Infinity → -1
    expect(balance.creditsUsed).toBe(999);
  });

  it('treats missing clip count as 0 gracefully', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return makeChain({ data: null, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: null, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const balance = await getCreditBalance('user-null-count');

    expect(balance.creditsUsed).toBe(0);
  });
});

describe('checkCreditAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns allowed:true when user is under credit limit', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return makeChain({ data: { tier: 'free', status: 'active' }, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: 10, error: null }); // 10 used out of 50
      }
      return makeChain({ data: null, error: null });
    });

    const result = await checkCreditAvailable('user-123', 1);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(40); // 50 - 10
    expect(result.limit).toBe(50);
  });

  it('returns allowed:false when user is at the credit limit', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return makeChain({ data: { tier: 'free', status: 'active' }, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: 50, error: null }); // 50 used out of 50 — exhausted
      }
      return makeChain({ data: null, error: null });
    });

    const result = await checkCreditAvailable('user-123', 1);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.limit).toBe(50);
  });

  it('returns allowed:false when cost exceeds remaining credits', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return makeChain({ data: { tier: 'free', status: 'active' }, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: 48, error: null }); // 2 remaining, cost is 3
      }
      return makeChain({ data: null, error: null });
    });

    const result = await checkCreditAvailable('user-123', 3);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(2);
  });

  it('returns allowed:true for unlimited tier regardless of usage', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return makeChain({ data: { tier: 'master', status: 'active' }, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: 99999, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const result = await checkCreditAvailable('user-master', 1);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(-1);
    expect(result.limit).toBe(-1);
  });

  it('returns allowed:true for team tier (finite but large) when under limit', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return makeChain({ data: { tier: 'team', status: 'active' }, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: 500, error: null }); // 500 used of 2000
      }
      return makeChain({ data: null, error: null });
    });

    const result = await checkCreditAvailable('user-team', 1);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1500);
    expect(result.limit).toBe(2000);
  });
});
