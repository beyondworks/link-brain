import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── node 환경 polyfill: window / document ────────────────────────────────────

// vitest environment: node — window/document 없음. globalThis에 직접 설정.
const _keydownHandlers: Array<(e: KeyboardEvent) => void> = [];

const mockGlobalThis = globalThis as Record<string, unknown>;

// window polyfill
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

// document.activeElement polyfill (훅의 isInputFocused() 용)
let _activeElementTag = '';
let _isContentEditable = false;

mockGlobalThis.document = {
  activeElement: null, // dynamic via getter below — overridden per test
};

Object.defineProperty(mockGlobalThis.document as Record<string, unknown>, 'activeElement', {
  configurable: true,
  get: () => {
    if (!_activeElementTag) return null;
    return { tagName: _activeElementTag, isContentEditable: _isContentEditable };
  },
});

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const mockSetViewMode = vi.fn();
const mockToggleSidebar = vi.fn();
const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();
const mockCloseClipPeek = vi.fn();
const mockSetOmniSearchOpen = vi.fn();

let _activeModal: string | null = null;
let _peekClipId: string | null = null;

vi.mock('@/stores/ui-store', () => ({
  useUIStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      setViewMode: mockSetViewMode,
      toggleSidebar: mockToggleSidebar,
      openModal: mockOpenModal,
      closeModal: mockCloseModal,
      activeModal: _activeModal,
      closeClipPeek: mockCloseClipPeek,
      peekClipId: _peekClipId,
      setOmniSearchOpen: mockSetOmniSearchOpen,
    }),
  ),
}));

// useEffect를 동기 실행으로 교체 — 훅 호출 즉시 핸들러 등록
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useEffect: (fn: () => (() => void) | void, _deps?: unknown[]) => {
      const cleanup = fn();
      if (typeof cleanup === 'function') {
        (globalThis as Record<string, unknown>).__lastEffectCleanup = cleanup;
      }
    },
  };
});

// ── Import after mocks ────────────────────────────────────────────────────────

import { useGlobalShortcuts } from './use-global-shortcuts';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Test suite ────────────────────────────────────────────────────────────────

describe('useGlobalShortcuts', () => {
  function dispatch(overrides: Partial<KeyboardEvent> = {}) {
    const e = makeEvent(overrides);
    // 가장 최근에 등록된 핸들러를 호출
    const handler = _keydownHandlers[_keydownHandlers.length - 1];
    handler?.(e);
    return e;
  }

  function initHook() {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- test helper
    useGlobalShortcuts();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    _activeModal = null;
    _peekClipId = null;
    _activeElementTag = '';
    _isContentEditable = false;
    _keydownHandlers.length = 0;
    initHook();
  });

  afterEach(() => {
    const cleanup = (globalThis as Record<string, unknown>).__lastEffectCleanup;
    if (typeof cleanup === 'function') (cleanup as () => void)();
    (globalThis as Record<string, unknown>).__lastEffectCleanup = undefined;
  });

  // ── Input focus guard ───────────────────────────────────────────────────────

  it('does nothing when an <input> element is focused', () => {
    _activeElementTag = 'INPUT';
    dispatch({ key: '/' });
    expect(mockSetOmniSearchOpen).not.toHaveBeenCalled();
  });

  it('does nothing when a <textarea> element is focused', () => {
    _activeElementTag = 'TEXTAREA';
    dispatch({ key: 'n' });
    expect(mockOpenModal).not.toHaveBeenCalled();
  });

  it('does nothing when a <select> element is focused', () => {
    _activeElementTag = 'SELECT';
    dispatch({ key: '[' });
    expect(mockToggleSidebar).not.toHaveBeenCalled();
  });

  it('does nothing when a contenteditable element is focused', () => {
    _activeElementTag = 'DIV';
    _isContentEditable = true;
    dispatch({ key: '/' });
    expect(mockSetOmniSearchOpen).not.toHaveBeenCalled();
  });

  // ── / key: open omni-search ─────────────────────────────────────────────────

  it('/ key calls setOmniSearchOpen(true)', () => {
    const e = dispatch({ key: '/' });
    expect(mockSetOmniSearchOpen).toHaveBeenCalledWith(true);
    expect((e.preventDefault as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  // ── Cmd/Ctrl+K: focus inline search input ──────────────────────────────────

  it('Cmd+K focuses inline search input via document.querySelector', () => {
    const mockFocus = vi.fn();
    const mockSelect = vi.fn();
    const origQS = document.querySelector;
    document.querySelector = vi.fn().mockReturnValue({ focus: mockFocus, select: mockSelect });
    const e = dispatch({ key: 'k', metaKey: true });
    expect(document.querySelector).toHaveBeenCalledWith('[data-search-input]');
    expect(mockFocus).toHaveBeenCalled();
    expect((e.preventDefault as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    document.querySelector = origQS;
  });

  it('Ctrl+K focuses inline search input via document.querySelector', () => {
    const mockFocus = vi.fn();
    const mockSelect = vi.fn();
    const origQS = document.querySelector;
    document.querySelector = vi.fn().mockReturnValue({ focus: mockFocus, select: mockSelect });
    dispatch({ key: 'k', ctrlKey: true });
    expect(mockFocus).toHaveBeenCalled();
    document.querySelector = origQS;
  });

  // ── g+<key> navigation sequences ───────────────────────────────────────────

  it('g then h calls router.push("/dashboard")', () => {
    dispatch({ key: 'g' });
    dispatch({ key: 'h' });
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
  });

  it('g then d calls router.push("/dashboard")', () => {
    dispatch({ key: 'g' });
    dispatch({ key: 'd' });
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
  });

  it('g then f calls router.push("/favorites")', () => {
    dispatch({ key: 'g' });
    dispatch({ key: 'f' });
    expect(mockRouterPush).toHaveBeenCalledWith('/favorites');
  });

  it('g then a calls router.push("/archive")', () => {
    dispatch({ key: 'g' });
    dispatch({ key: 'a' });
    expect(mockRouterPush).toHaveBeenCalledWith('/archive');
  });

  it('g then c calls router.push("/collections")', () => {
    dispatch({ key: 'g' });
    dispatch({ key: 'c' });
    expect(mockRouterPush).toHaveBeenCalledWith('/collections');
  });

  it('g then s calls router.push("/settings")', () => {
    dispatch({ key: 'g' });
    dispatch({ key: 's' });
    expect(mockRouterPush).toHaveBeenCalledWith('/settings');
  });

  it('g then i calls router.push("/insights")', () => {
    dispatch({ key: 'g' });
    dispatch({ key: 'i' });
    expect(mockRouterPush).toHaveBeenCalledWith('/insights');
  });

  it('g then e calls router.push("/explore")', () => {
    dispatch({ key: 'g' });
    dispatch({ key: 'e' });
    expect(mockRouterPush).toHaveBeenCalledWith('/explore');
  });

  it('g without follow-up does not navigate', () => {
    dispatch({ key: 'g' });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  // ── Escape ─────────────────────────────────────────────────────────────────

  it('Escape closes activeModal when one is open', () => {
    _activeModal = 'addClip';
    _keydownHandlers.length = 0;
    initHook(); // re-init with updated _activeModal in closure

    dispatch({ key: 'Escape' });

    expect(mockCloseModal).toHaveBeenCalled();
    expect(mockCloseClipPeek).not.toHaveBeenCalled();
  });

  it('Escape closes peek panel when no modal but peek is open', () => {
    _peekClipId = 'clip-123';
    _keydownHandlers.length = 0;
    initHook();

    dispatch({ key: 'Escape' });

    expect(mockCloseClipPeek).toHaveBeenCalled();
    expect(mockCloseModal).not.toHaveBeenCalled();
  });

  it('Escape does nothing when neither modal nor peek is open', () => {
    dispatch({ key: 'Escape' });
    expect(mockCloseModal).not.toHaveBeenCalled();
    expect(mockCloseClipPeek).not.toHaveBeenCalled();
  });

  // ── View mode ──────────────────────────────────────────────────────────────

  it('1 key calls setViewMode("grid")', () => {
    dispatch({ key: '1' });
    expect(mockSetViewMode).toHaveBeenCalledWith('grid');
  });

  it('2 key calls setViewMode("list")', () => {
    dispatch({ key: '2' });
    expect(mockSetViewMode).toHaveBeenCalledWith('list');
  });

  it('3 key calls setViewMode("headlines")', () => {
    dispatch({ key: '3' });
    expect(mockSetViewMode).toHaveBeenCalledWith('headlines');
  });

  // ── Single-key shortcuts ───────────────────────────────────────────────────

  it('n key calls openModal("addClip")', () => {
    dispatch({ key: 'n' });
    expect(mockOpenModal).toHaveBeenCalledWith('addClip');
  });

  it('Cmd+N calls openModal("addClip")', () => {
    dispatch({ key: 'n', metaKey: true });
    expect(mockOpenModal).toHaveBeenCalledWith('addClip');
  });

  it('[ key calls toggleSidebar()', () => {
    dispatch({ key: '[' });
    expect(mockToggleSidebar).toHaveBeenCalled();
  });

  it('? key calls openModal("shortcuts")', () => {
    dispatch({ key: '?' });
    expect(mockOpenModal).toHaveBeenCalledWith('shortcuts');
  });

  // ── Alt key suppresses single-key shortcuts ────────────────────────────────

  it('Alt+/ does not open omni-search', () => {
    dispatch({ key: '/', altKey: true });
    expect(mockSetOmniSearchOpen).not.toHaveBeenCalled();
  });

  it('Alt+n does not open addClip modal', () => {
    dispatch({ key: 'n', altKey: true });
    expect(mockOpenModal).not.toHaveBeenCalled();
  });
});
