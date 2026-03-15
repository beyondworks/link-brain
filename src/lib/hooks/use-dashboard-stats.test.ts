import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock @tanstack/react-query before importing hook
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((opts) => ({
    _opts: opts,
    data: undefined,
    isLoading: false,
    error: null,
  })),
}));

// Mock useCurrentUser directly to avoid its internal useQuery call
vi.mock('@/lib/hooks/use-current-user', () => ({
  useCurrentUser: vi.fn(),
}));

// Mock supabase client (dashboard stats uses supabase directly, not fetch)
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { supabase } from '@/lib/supabase/client';
import { useDashboardStats } from './use-dashboard-stats';

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;
const mockUseCurrentUser = useCurrentUser as ReturnType<typeof vi.fn>;

describe('useDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({ user: { id: 'user-123' }, isLoading: false });
  });

  it('calls useQuery with ["dashboard-stats", userId] query key', () => {
    useDashboardStats();
    expect(mockUseQuery).toHaveBeenCalledOnce();
    const opts = mockUseQuery.mock.calls[0][0];
    expect(opts.queryKey).toEqual(['dashboard-stats', 'user-123']);
  });

  it('is enabled when user is present', () => {
    useDashboardStats();
    const opts = mockUseQuery.mock.calls[0][0];
    expect(opts.enabled).toBe(true);
  });

  it('is disabled when user is null', () => {
    mockUseCurrentUser.mockReturnValue({ user: null, isLoading: false });
    useDashboardStats();
    const opts = mockUseQuery.mock.calls[0][0];
    expect(opts.enabled).toBe(false);
  });

  it('has staleTime of 60 seconds (60000ms)', () => {
    useDashboardStats();
    const opts = mockUseQuery.mock.calls[0][0];
    expect(opts.staleTime).toBe(60_000);
  });

  it('queryFn returns totalClips, thisMonthClips, favoriteCount from supabase counts', async () => {
    mockUseCurrentUser.mockReturnValue({ user: { id: 'user-abc' }, isLoading: false });

    // Build a chainable supabase mock that resolves with count
    const makeChain = (count: number) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        then: (resolve: (v: { count: number; error: null }) => void) =>
          Promise.resolve({ count, error: null }).then(resolve),
      };
      return chain;
    };

    (supabase.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(makeChain(10))  // totalClips
      .mockReturnValueOnce(makeChain(3))   // thisMonthClips
      .mockReturnValueOnce(makeChain(5));  // favoriteCount

    useDashboardStats();
    const opts = mockUseQuery.mock.calls[0][0];
    const result = await opts.queryFn();

    expect(result).toEqual({
      totalClips: 10,
      thisMonthClips: 3,
      favoriteCount: 5,
    });
  });
});
