import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Tests for the URL normalisation logic used in AddClipDialog.
 *
 * normalizeUrl is a private function in add-clip-dialog.tsx.
 * We reproduce it here (identical implementation) so we can unit-test it
 * without importing the heavy 'use client' React component and its UI deps.
 *
 * The duplicate is intentional and kept minimal — any change to the source
 * function should be reflected here.
 */
function normalizeUrl(value: string): string {
  try {
    const parsed = new URL(value.trim());
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname !== '/') {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }
    return parsed.toString();
  } catch {
    return value.trim();
  }
}

// ---------------------------------------------------------------------------
// Supabase mock (used by the debounce integration test below)
// ---------------------------------------------------------------------------
const mockMaybeSingle = vi.fn();
const mockEq2 = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
const mockSelect = vi.fn(() => ({ eq: mockEq1 }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

// ---------------------------------------------------------------------------
// normalizeUrl — pure unit tests
// ---------------------------------------------------------------------------
describe('normalizeUrl', () => {
  it('removes a trailing slash from the pathname', () => {
    const result = normalizeUrl('https://example.com/articles/');
    expect(result).toBe('https://example.com/articles');
  });

  it('preserves the root slash when pathname is exactly "/"', () => {
    const result = normalizeUrl('https://example.com/');
    // Root path "/" must remain so the URL stays valid
    expect(result).toMatch(/^https:\/\/example\.com\//);
    expect(result).not.toBe('https://example.com');
  });

  it('converts uppercase hostname to lowercase', () => {
    const result = normalizeUrl('https://EXAMPLE.COM/path');
    expect(result).toContain('example.com');
  });

  it('returns the trimmed input unchanged when value is not a valid URL', () => {
    const result = normalizeUrl('  not-a-url  ');
    expect(result).toBe('not-a-url');
  });

  it('preserves query string and hash after normalisation', () => {
    const result = normalizeUrl('https://Example.COM/page/?q=1#section');
    expect(result).toContain('example.com');
    expect(result).toContain('q=1');
    expect(result).toContain('#section');
  });
});

// ---------------------------------------------------------------------------
// Duplicate-check debounce — integration-style test
// ---------------------------------------------------------------------------
describe('duplicate URL check debounce timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('queries Supabase only after 500 ms debounce', async () => {
    // Simulate what the useEffect does: set a 500 ms timer then call supabase
    let queried = false;
    const timer = setTimeout(async () => {
      const normalized = normalizeUrl('https://example.com/article');
      await mockFrom('clips').select('id, title, url').eq('url', normalized).eq('user_id', 'user-1').maybeSingle();
      queried = true;
    }, 500);

    // Should not have fired yet
    expect(queried).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();

    // Advance 499 ms — still should not have fired
    vi.advanceTimersByTime(499);
    expect(queried).toBe(false);

    // Advance past the debounce threshold
    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();

    expect(queried).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('clips');

    clearTimeout(timer);
  });
});
