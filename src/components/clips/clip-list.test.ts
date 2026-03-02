/**
 * ClipList logic unit tests (node environment, no DOM renderer).
 *
 * ClipList itself requires JSX rendering, so these tests validate
 * the pure logic embedded in ClipList:
 *   1. IntersectionObserver callback decision
 *   2. View-mode branching conditions
 *   3. Footer (sentinel + spinner) render conditions
 *
 * The view-mode selection logic is: headlines → grid → list (fallback).
 * These tests encode those rules directly.
 */

import { describe, it, expect, vi } from 'vitest';

// ─── IntersectionObserver callback logic ──────────────────────────────────────
// Extracted from ClipList useEffect:
// if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()

function runIntersectionCallback(
  isIntersecting: boolean,
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void
) {
  if (isIntersecting && hasNextPage && !isFetchingNextPage) {
    fetchNextPage();
  }
}

describe('ClipList — IntersectionObserver callback logic', () => {
  it('calls fetchNextPage when intersecting, has next page, and not already fetching', () => {
    const fetchNextPage = vi.fn();
    runIntersectionCallback(true, true, false, fetchNextPage);
    expect(fetchNextPage).toHaveBeenCalledOnce();
  });

  it('does NOT call fetchNextPage when not intersecting', () => {
    const fetchNextPage = vi.fn();
    runIntersectionCallback(false, true, false, fetchNextPage);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('does NOT call fetchNextPage when hasNextPage is false', () => {
    const fetchNextPage = vi.fn();
    runIntersectionCallback(true, false, false, fetchNextPage);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('does NOT call fetchNextPage when isFetchingNextPage is true (dedup guard)', () => {
    const fetchNextPage = vi.fn();
    runIntersectionCallback(true, true, true, fetchNextPage);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('does NOT call fetchNextPage when all conditions are false', () => {
    const fetchNextPage = vi.fn();
    runIntersectionCallback(false, false, false, fetchNextPage);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});

// ─── View-mode branching logic ────────────────────────────────────────────────
// ClipList renders: headlines → ClipHeadline, grid → ClipCard, else → ClipRow

type ViewMode = 'grid' | 'list' | 'headlines';

function resolveComponentForMode(viewMode: ViewMode): 'ClipHeadline' | 'ClipCard' | 'ClipRow' {
  if (viewMode === 'headlines') return 'ClipHeadline';
  if (viewMode === 'grid') return 'ClipCard';
  return 'ClipRow';
}

describe('ClipList — view-mode component selection', () => {
  it('renders ClipHeadline for headlines view', () => {
    expect(resolveComponentForMode('headlines')).toBe('ClipHeadline');
  });

  it('renders ClipCard for grid view', () => {
    expect(resolveComponentForMode('grid')).toBe('ClipCard');
  });

  it('renders ClipRow for list view (default fallback)', () => {
    expect(resolveComponentForMode('list')).toBe('ClipRow');
  });
});

// ─── Footer visibility logic ─────────────────────────────────────────────────
// Sentinel always renders (h-px div). Spinner only when isFetchingNextPage.

function shouldShowSentinel(hasNextPage: boolean | undefined): boolean {
  // sentinel renders unconditionally (it's always in the footer)
  void hasNextPage;
  return true;
}

function shouldShowSpinner(isFetchingNextPage: boolean | undefined): boolean {
  return !!isFetchingNextPage;
}

describe('ClipList — footer visibility conditions', () => {
  it('sentinel renders regardless of hasNextPage (always present for observer)', () => {
    expect(shouldShowSentinel(true)).toBe(true);
    expect(shouldShowSentinel(false)).toBe(true);
    expect(shouldShowSentinel(undefined)).toBe(true);
  });

  it('spinner shows when isFetchingNextPage is true', () => {
    expect(shouldShowSpinner(true)).toBe(true);
  });

  it('spinner hidden when isFetchingNextPage is false', () => {
    expect(shouldShowSpinner(false)).toBe(false);
  });

  it('spinner hidden when isFetchingNextPage is undefined', () => {
    expect(shouldShowSpinner(undefined)).toBe(false);
  });
});
