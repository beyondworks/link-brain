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

// Mock supabase-provider
vi.mock('@/components/providers/supabase-provider', () => ({
  useSupabase: vi.fn(),
}));

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/components/providers/supabase-provider';
import { useInsights } from './use-insights';

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;
const mockUseSupabase = useSupabase as ReturnType<typeof vi.fn>;

describe('useInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated user
    mockUseSupabase.mockReturnValue({ user: { id: 'user-1' } });
  });

  it('calls useQuery with ["insights", userId] query key', () => {
    useInsights();
    expect(mockUseQuery).toHaveBeenCalledOnce();
    const opts = mockUseQuery.mock.calls[0][0];
    expect(opts.queryKey).toEqual(['insights', 'user-1']);
  });

  it('is enabled when user is present', () => {
    mockUseSupabase.mockReturnValue({ user: { id: 'user-1' } });
    useInsights();
    const opts = mockUseQuery.mock.calls[0][0];
    expect(opts.enabled).toBe(true);
  });

  it('is disabled when user is null', () => {
    mockUseSupabase.mockReturnValue({ user: null });
    useInsights();
    const opts = mockUseQuery.mock.calls[0][0];
    expect(opts.enabled).toBe(false);
  });

  it('has staleTime of 5 minutes (300000ms)', () => {
    useInsights();
    const opts = mockUseQuery.mock.calls[0][0];
    expect(opts.staleTime).toBe(5 * 60 * 1000);
  });

  it('queryFn fetches /api/v1/insights and returns data on success', async () => {
    const mockData = {
      totalClips: 42,
      platformBreakdown: [],
      topDomains: [],
      savedThisWeek: 5,
      readingTimeTotal: 120,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockData }),
    } as unknown as Response);

    useInsights();
    const opts = mockUseQuery.mock.calls[0][0];
    const result = await opts.queryFn();

    expect(global.fetch).toHaveBeenCalledWith('/api/v1/insights');
    expect(result).toEqual(mockData);
  });

  it('queryFn throws when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as unknown as Response);

    useInsights();
    const opts = mockUseQuery.mock.calls[0][0];
    await expect(opts.queryFn()).rejects.toThrow('Insights API error: 500');
  });

  it('queryFn throws when API returns success:false', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: false }),
    } as unknown as Response);

    useInsights();
    const opts = mockUseQuery.mock.calls[0][0];
    await expect(opts.queryFn()).rejects.toThrow('Insights API returned failure');
  });
});
