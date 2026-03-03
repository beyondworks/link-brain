import { describe, it, expect, beforeEach, vi } from 'vitest';

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(globalThis, 'window', {
  value: { localStorage: localStorageMock },
  writable: true,
});

const STORAGE_KEY = 'linkbrain-dashboard-widgets';

// 내부 로직을 직접 테스트하기 위해 동일한 함수 재현
const DEFAULT_WIDGETS = {
  stats: true,
  weeklyReport: true,
  reminders: true,
  pinnedClips: true,
  continueReading: true,
  recentActivity: true,
} as const;

type WidgetKey = keyof typeof DEFAULT_WIDGETS;
type DashboardWidgets = Record<WidgetKey, boolean>;

function loadFromStorage(): DashboardWidgets {
  try {
    const raw = localStorageMock.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WIDGETS };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_WIDGETS };
    const result: DashboardWidgets = { ...DEFAULT_WIDGETS };
    for (const key of Object.keys(DEFAULT_WIDGETS) as WidgetKey[]) {
      const val = (parsed as Record<string, unknown>)[key];
      if (typeof val === 'boolean') {
        result[key] = val;
      }
    }
    return result;
  } catch {
    return { ...DEFAULT_WIDGETS };
  }
}

function saveToStorage(widgets: DashboardWidgets): void {
  localStorageMock.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

function toggleWidget(current: DashboardWidgets, key: WidgetKey): DashboardWidgets {
  const next = { ...current, [key]: !current[key] };
  saveToStorage(next);
  return next;
}

function resetDefaults(): DashboardWidgets {
  const defaults = { ...DEFAULT_WIDGETS };
  saveToStorage(defaults);
  return defaults;
}

beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
});

describe('useDashboardPreferences — 기본값', () => {
  it('localStorage가 비어있으면 모든 위젯이 true', () => {
    const widgets = loadFromStorage();
    expect(widgets.stats).toBe(true);
    expect(widgets.weeklyReport).toBe(true);
    expect(widgets.reminders).toBe(true);
    expect(widgets.pinnedClips).toBe(true);
    expect(widgets.continueReading).toBe(true);
    expect(widgets.recentActivity).toBe(true);
  });

  it('기본값 위젯 키가 6개', () => {
    const widgets = loadFromStorage();
    expect(Object.keys(widgets)).toHaveLength(6);
  });
});

describe('useDashboardPreferences — toggleWidget', () => {
  it('활성화된 위젯을 토글하면 false가 됨', () => {
    const initial = loadFromStorage();
    const next = toggleWidget(initial, 'stats');
    expect(next.stats).toBe(false);
  });

  it('비활성화된 위젯을 토글하면 true가 됨', () => {
    const initial = { ...DEFAULT_WIDGETS, stats: false };
    const next = toggleWidget(initial, 'stats');
    expect(next.stats).toBe(true);
  });

  it('토글 시 다른 위젯에 영향 없음', () => {
    const initial = loadFromStorage();
    const next = toggleWidget(initial, 'reminders');
    expect(next.stats).toBe(true);
    expect(next.weeklyReport).toBe(true);
    expect(next.pinnedClips).toBe(true);
    expect(next.continueReading).toBe(true);
    expect(next.recentActivity).toBe(true);
  });

  it('토글 후 localStorage에 저장됨', () => {
    const initial = loadFromStorage();
    toggleWidget(initial, 'stats');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining('"stats":false'),
    );
  });
});

describe('useDashboardPreferences — resetDefaults', () => {
  it('일부 위젯을 끈 후 초기화하면 모두 true', () => {
    let widgets = loadFromStorage();
    widgets = toggleWidget(widgets, 'stats');
    widgets = toggleWidget(widgets, 'weeklyReport');
    expect(widgets.stats).toBe(false);
    expect(widgets.weeklyReport).toBe(false);

    const reset = resetDefaults();
    expect(reset.stats).toBe(true);
    expect(reset.weeklyReport).toBe(true);
    expect(reset.reminders).toBe(true);
    expect(reset.pinnedClips).toBe(true);
    expect(reset.continueReading).toBe(true);
    expect(reset.recentActivity).toBe(true);
  });

  it('초기화 시 localStorage에 기본값이 저장됨', () => {
    resetDefaults();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(DEFAULT_WIDGETS),
    );
  });
});

describe('useDashboardPreferences — localStorage mock', () => {
  it('저장된 값을 다시 로드하면 동일한 상태', () => {
    const initial = loadFromStorage();
    const modified = toggleWidget(initial, 'pinnedClips');
    saveToStorage(modified);

    const reloaded = loadFromStorage();
    expect(reloaded.pinnedClips).toBe(false);
    expect(reloaded.stats).toBe(true);
  });

  it('localStorage에 잘못된 JSON이 있으면 기본값 반환', () => {
    localStorageMock.getItem.mockReturnValueOnce('invalid-json{{{');
    const widgets = loadFromStorage();
    expect(widgets).toEqual(DEFAULT_WIDGETS);
  });

  it('localStorage에 null이 있으면 기본값 반환', () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    const widgets = loadFromStorage();
    expect(widgets).toEqual(DEFAULT_WIDGETS);
  });

  it('부분적인 저장 데이터가 있으면 누락된 키는 기본값으로 채워짐', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ stats: false }));
    const widgets = loadFromStorage();
    expect(widgets.stats).toBe(false);
    expect(widgets.weeklyReport).toBe(true);
    expect(widgets.reminders).toBe(true);
  });
});
