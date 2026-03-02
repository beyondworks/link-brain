import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── node 환경 polyfill ────────────────────────────────────────────────────────

const _keydownHandlers: Array<(e: KeyboardEvent) => void> = [];
const mockGlobalThis = globalThis as Record<string, unknown>;

mockGlobalThis.window = {
  addEventListener: (type: string, handler: unknown) => {
    if (type === 'keydown') _keydownHandlers.push(handler as (e: KeyboardEvent) => void);
  },
  removeEventListener: (type: string, handler: unknown) => {
    if (type === 'keydown') {
      const idx = _keydownHandlers.indexOf(handler as (e: KeyboardEvent) => void);
      if (idx !== -1) _keydownHandlers.splice(idx, 1);
    }
  },
};

let _activeElementTag = '';
let _isContentEditable = false;

mockGlobalThis.document = {};
Object.defineProperty(mockGlobalThis.document as Record<string, unknown>, 'activeElement', {
  configurable: true,
  get: () => {
    if (!_activeElementTag) return null;
    return { tagName: _activeElementTag, isContentEditable: _isContentEditable };
  },
});
(mockGlobalThis.document as Record<string, unknown>).querySelector = () => null;

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockOpenClipPeek = vi.fn();
const mockToggleClipSelection = vi.fn();

vi.mock('@/stores/ui-store', () => ({
  useUIStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      openClipPeek: mockOpenClipPeek,
      toggleClipSelection: mockToggleClipSelection,
    }),
  ),
}));

// useState: focusedIndex 상태 추적
// 훅에는 useState(null) 호출이 하나뿐이므로 모든 호출을 intercept
let _focusedIndex: number | null = null;
const _setFocusedIndex = vi.fn(
  (valOrFn: ((prev: number | null) => number | null) | number | null) => {
    if (typeof valOrFn === 'function') {
      _focusedIndex = valOrFn(_focusedIndex);
    } else {
      _focusedIndex = valOrFn;
    }
  },
);

// useEffect calls 추적: 첫 번째=deps reset effect, 두 번째=keydown effect
// 동기 실행하되 각 effect를 별도 배열에 수집해 keydown effect만 등록되도록 함
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _effectCallCount = 0;

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: vi.fn((_initial: unknown) => [_focusedIndex, _setFocusedIndex]),
    useEffect: (fn: () => (() => void) | void, _deps?: unknown[]) => {
      _effectCallCount++;
      const cleanup = fn();
      if (typeof cleanup === 'function') {
        const existing = (globalThis as Record<string, unknown>).__effectCleanups as
          | (() => void)[]
          | undefined;
        ((globalThis as Record<string, unknown>).__effectCleanups as (() => void)[]) = [
          ...(existing ?? []),
          cleanup,
        ];
      }
    },
    useCallback: (fn: unknown) => fn,
  };
});

// ── Import after mocks ────────────────────────────────────────────────────────

import { useListKeyboardNav } from './use-list-keyboard-nav';
import type { ClipData } from '@/types/database';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeClip(id: string): ClipData {
  return {
    id,
    user_id: 'user-1',
    url: `https://example.com/${id}`,
    title: `Clip ${id}`,
    description: null,
    content: null,
    platform: 'web',
    favicon_url: null,
    og_image_url: null,
    is_favorite: false,
    is_archived: false,
    is_read_later: false,
    is_pinned: false,
    tags: [],
    category_id: null,
    reading_time_minutes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  } as unknown as ClipData;
}

function makeEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key: '',
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as KeyboardEvent;
}

const clips = [makeClip('a'), makeClip('b'), makeClip('c')];

// ── Test suite ────────────────────────────────────────────────────────────────

describe('useListKeyboardNav', () => {
  function dispatch(overrides: Partial<KeyboardEvent> = {}) {
    const e = makeEvent(overrides);
    const handler = _keydownHandlers[_keydownHandlers.length - 1];
    handler?.(e);
    return e;
  }

  function initHook(options: { clips?: ClipData[]; onOpen?: (clip: ClipData) => void } = {}) {
    _keydownHandlers.length = 0;
    _effectCallCount = 0;
    (globalThis as Record<string, unknown>).__effectCleanups = [];
    // eslint-disable-next-line react-hooks/rules-of-hooks -- test helper
    useListKeyboardNav({ clips: options.clips ?? clips, onOpen: options.onOpen });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    _focusedIndex = null;
    _activeElementTag = '';
    _isContentEditable = false;
    initHook();
  });

  afterEach(() => {
    const cleanups = (globalThis as Record<string, unknown>).__effectCleanups as
      | (() => void)[]
      | undefined;
    cleanups?.forEach((fn) => fn());
    (globalThis as Record<string, unknown>).__effectCleanups = [];
  });

  // ── j key: move focus down ─────────────────────────────────────────────────

  it('j key: updater returns 0 when prev is null', () => {
    dispatch({ key: 'j' });
    // setFocusedIndex was called with a functional updater
    const calls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    expect(calls).toHaveLength(1);
    const updater = calls[0][0] as (prev: number | null) => number;
    expect(updater(null)).toBe(0);
  });

  it('j key: updater increments index from 0 to 1', () => {
    dispatch({ key: 'j' });
    const calls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    const updater = calls[0][0] as (prev: number | null) => number;
    expect(updater(0)).toBe(1);
  });

  it('j key: updater increments index from 1 to 2', () => {
    dispatch({ key: 'j' });
    const calls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    const updater = calls[0][0] as (prev: number | null) => number;
    expect(updater(1)).toBe(2);
  });

  it('ArrowDown behaves like j', () => {
    dispatch({ key: 'ArrowDown' });
    const calls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    expect(calls).toHaveLength(1);
    const updater = calls[0][0] as (prev: number | null) => number;
    expect(updater(0)).toBe(1);
  });

  // ── k key: move focus up ───────────────────────────────────────────────────

  it('k key: updater decrements index from 2 to 1', () => {
    dispatch({ key: 'k' });
    const calls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    const updater = calls[0][0] as (prev: number | null) => number;
    expect(updater(2)).toBe(1);
  });

  it('k key: updater decrements index from 1 to 0', () => {
    dispatch({ key: 'k' });
    const calls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    const updater = calls[0][0] as (prev: number | null) => number;
    expect(updater(1)).toBe(0);
  });

  it('k key: updater returns clips.length - 1 when prev is null', () => {
    dispatch({ key: 'k' });
    const calls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    const updater = calls[0][0] as (prev: number | null) => number;
    expect(updater(null)).toBe(clips.length - 1);
  });

  it('ArrowUp behaves like k', () => {
    dispatch({ key: 'ArrowUp' });
    const calls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    expect(calls).toHaveLength(1);
    const updater = calls[0][0] as (prev: number | null) => number;
    expect(updater(2)).toBe(1);
  });

  // ── Boundary: upper ────────────────────────────────────────────────────────

  it('j key: upper boundary — stays at clips.length - 1', () => {
    dispatch({ key: 'j' });
    const calls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    const updater = calls[0][0] as (prev: number | null) => number;
    const last = clips.length - 1;
    expect(updater(last)).toBe(last);
  });

  // ── Boundary: lower ────────────────────────────────────────────────────────

  it('k key: lower boundary — stays at 0', () => {
    dispatch({ key: 'k' });
    const calls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    const updater = calls[0][0] as (prev: number | null) => number;
    expect(updater(0)).toBe(0);
  });

  // ── x key: toggle selection ────────────────────────────────────────────────

  it('x key calls toggleClipSelection with focused clip id', () => {
    _focusedIndex = 1;
    initHook();
    dispatch({ key: 'x' });
    expect(mockToggleClipSelection).toHaveBeenCalledWith(clips[1].id);
  });

  it('x key does nothing when focusedIndex is null', () => {
    _focusedIndex = null;
    initHook();
    dispatch({ key: 'x' });
    expect(mockToggleClipSelection).not.toHaveBeenCalled();
  });

  // ── Enter key: open clip ───────────────────────────────────────────────────

  it('Enter calls openClipPeek when no onOpen provided', () => {
    _focusedIndex = 0;
    initHook();
    dispatch({ key: 'Enter' });
    expect(mockOpenClipPeek).toHaveBeenCalledWith(clips[0].id);
  });

  it('Enter calls onOpen callback when provided', () => {
    const mockOnOpen = vi.fn();
    _focusedIndex = 1;
    initHook({ onOpen: mockOnOpen });
    dispatch({ key: 'Enter' });
    expect(mockOnOpen).toHaveBeenCalledWith(clips[1]);
    expect(mockOpenClipPeek).not.toHaveBeenCalled();
  });

  it('Enter does nothing when focusedIndex is null', () => {
    _focusedIndex = null;
    initHook();
    dispatch({ key: 'Enter' });
    expect(mockOpenClipPeek).not.toHaveBeenCalled();
  });

  // ── Input focus guard ──────────────────────────────────────────────────────

  it('does nothing when an <input> is focused', () => {
    _activeElementTag = 'INPUT';
    _focusedIndex = null;
    initHook();
    dispatch({ key: 'j' });
    // Only non-functional (null) calls should exist — no functional updater
    const functorCalls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    expect(functorCalls).toHaveLength(0);
  });

  it('does nothing when a <textarea> is focused', () => {
    _activeElementTag = 'TEXTAREA';
    _focusedIndex = null;
    initHook();
    dispatch({ key: 'k' });
    const functorCalls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    expect(functorCalls).toHaveLength(0);
  });

  it('does nothing when a contenteditable element is focused', () => {
    _activeElementTag = 'DIV';
    _isContentEditable = true;
    _focusedIndex = null;
    initHook();
    dispatch({ key: 'j' });
    const functorCalls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    expect(functorCalls).toHaveLength(0);
  });

  // ── Modifier keys ──────────────────────────────────────────────────────────

  it('does nothing when metaKey is held', () => {
    dispatch({ key: 'j', metaKey: true });
    const functorCalls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    expect(functorCalls).toHaveLength(0);
  });

  it('does nothing when ctrlKey is held', () => {
    dispatch({ key: 'k', ctrlKey: true });
    const functorCalls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    expect(functorCalls).toHaveLength(0);
  });

  it('does nothing when altKey is held', () => {
    dispatch({ key: 'j', altKey: true });
    const functorCalls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    expect(functorCalls).toHaveLength(0);
  });

  // ── Empty clips list ───────────────────────────────────────────────────────

  it('does nothing when clips list is empty', () => {
    initHook({ clips: [] });
    dispatch({ key: 'j' });
    const functorCalls = _setFocusedIndex.mock.calls.filter((c) => typeof c[0] === 'function');
    expect(functorCalls).toHaveLength(0);
  });

  // ── preventDefault ─────────────────────────────────────────────────────────

  it('j key calls preventDefault', () => {
    const e = dispatch({ key: 'j' });
    expect((e.preventDefault as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('k key calls preventDefault', () => {
    const e = dispatch({ key: 'k' });
    expect((e.preventDefault as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });
});
