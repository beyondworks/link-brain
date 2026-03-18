import { vi, describe, it, expect, beforeEach } from 'vitest';

// Must be hoisted before importing the module under test
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCreditBalance } from './credit-service';

// Helper: build a chainable Supabase query mock that resolves to `result`
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'gte', 'not', 'single', 'head'];
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

  it('returns free tier defaults when user has no plan set', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return makeChain({ data: { plan: 'free' }, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: 0, error: null });
      }
      if (table === 'collections') {
        return makeChain({ count: 0, error: null });
      }
      if (table === 'api_keys') {
        return makeChain({ count: 0, error: null });
      }
      if (table === 'credit_usage') {
        return makeChain({ data: [], error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const balance = await getCreditBalance('user-123');

    expect(balance.userId).toBe('user-123');
    expect(balance.tier).toBe('free');
    expect(balance.creditsUsed).toBe(0);
    expect(balance.creditsLimit).toBe(100);
    expect(balance.clipsUsed).toBe(0);
    expect(balance.clipsLimit).toBe(100);
    expect(balance.collectionsLimit).toBe(5);
    expect(balance.studioLimit).toBe(10);
    expect(typeof balance.resetAt).toBe('string');
  });

  it('returns correct limits for pro tier', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return makeChain({ data: { plan: 'pro' }, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: 42, error: null });
      }
      if (table === 'collections') {
        return makeChain({ count: 3, error: null });
      }
      if (table === 'api_keys') {
        return makeChain({ count: 2, error: null });
      }
      if (table === 'credit_usage') {
        return makeChain({ data: [{ cost: 10 }, { cost: 5 }], error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const balance = await getCreditBalance('user-pro');

    expect(balance.tier).toBe('pro');
    expect(balance.creditsLimit).toBe(500);
    expect(balance.clipsLimit).toBe(-1); // Infinity → -1
    expect(balance.collectionsLimit).toBe(-1);
    expect(balance.clipsUsed).toBe(42);
    expect(balance.apiKeysLimit).toBe(5);
    expect(balance.studioLimit).toBe(100);
  });

  it('treats unknown tier as free fallback', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return makeChain({ data: { plan: 'unknown' }, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: 0, error: null });
      }
      if (table === 'collections') {
        return makeChain({ count: 0, error: null });
      }
      if (table === 'api_keys') {
        return makeChain({ count: 0, error: null });
      }
      if (table === 'credit_usage') {
        return makeChain({ data: [], error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const balance = await getCreditBalance('user-unknown');

    expect(balance.tier).toBe('free');
    expect(balance.creditsLimit).toBe(100);
  });

  it('falls back to free when plan column is missing', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return makeChain({ data: null, error: { message: 'not found' } });
      }
      if (table === 'clips') {
        return makeChain({ count: 0, error: null });
      }
      if (table === 'collections') {
        return makeChain({ count: 0, error: null });
      }
      if (table === 'api_keys') {
        return makeChain({ count: 0, error: null });
      }
      if (table === 'credit_usage') {
        return makeChain({ data: [], error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const balance = await getCreditBalance('user-null');

    expect(balance.tier).toBe('free');
    expect(balance.creditsLimit).toBe(100);
  });

  it('handles null credit_usage data gracefully', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return makeChain({ data: { plan: 'free' }, error: null });
      }
      if (table === 'clips') {
        return makeChain({ count: 5, error: null });
      }
      if (table === 'collections') {
        return makeChain({ count: 1, error: null });
      }
      if (table === 'api_keys') {
        return makeChain({ count: 0, error: null });
      }
      if (table === 'credit_usage') {
        return makeChain({ data: null, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const balance = await getCreditBalance('user-null-credits');

    expect(balance.creditsUsed).toBe(0);
    expect(balance.studioUsed).toBe(0);
  });
});
