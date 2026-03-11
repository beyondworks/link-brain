'use client';

import { useState, useEffect, useCallback } from 'react';

export type DashboardView = 'summary' | 'detail';

export type WidgetKey =
  | 'stats'
  | 'weeklyReport'
  | 'reminders'
  | 'pinnedClips'
  | 'continueReading'
  | 'recentActivity';

export interface DashboardWidgets {
  stats: boolean;
  weeklyReport: boolean;
  reminders: boolean;
  pinnedClips: boolean;
  continueReading: boolean;
  recentActivity: boolean;
}

export interface WidgetMeta {
  key: WidgetKey;
  label: string;
}

export const WIDGET_META: WidgetMeta[] = [
  { key: 'stats', label: '통계 카드' },
  { key: 'weeklyReport', label: '주간 리포트' },
  { key: 'reminders', label: '리마인더' },
  { key: 'pinnedClips', label: '고정된 클립' },
  { key: 'continueReading', label: '나중에 읽기' },
  { key: 'recentActivity', label: '최근 활동' },
];

const STORAGE_KEY = 'linkbrain-dashboard-widgets';
const VIEW_STORAGE_KEY = 'linkbrain-dashboard-view';

const DEFAULT_WIDGETS: DashboardWidgets = {
  stats: true,
  weeklyReport: true,
  reminders: true,
  pinnedClips: true,
  continueReading: true,
  recentActivity: true,
};

function loadFromStorage(): DashboardWidgets {
  if (typeof window === 'undefined') return { ...DEFAULT_WIDGETS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WIDGETS };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_WIDGETS };
    const result = { ...DEFAULT_WIDGETS };
    for (const key of Object.keys(DEFAULT_WIDGETS) as WidgetKey[]) {
      if (key in (parsed as Record<string, unknown>)) {
        const val = (parsed as Record<string, unknown>)[key];
        if (typeof val === 'boolean') {
          result[key] = val;
        }
      }
    }
    return result;
  } catch {
    return { ...DEFAULT_WIDGETS };
  }
}

function saveToStorage(widgets: DashboardWidgets): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch {
    // localStorage 쓰기 실패 시 무시
  }
}

function loadViewFromStorage(): DashboardView {
  if (typeof window === 'undefined') return 'detail';
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (raw === 'summary' || raw === 'detail') return raw;
    return 'detail';
  } catch {
    return 'detail';
  }
}

export function useDashboardPreferences(): {
  widgets: DashboardWidgets;
  toggleWidget: (key: WidgetKey) => void;
  resetDefaults: () => void;
  dashboardView: DashboardView;
  setDashboardView: (view: DashboardView) => void;
} {
  const [widgets, setWidgets] = useState<DashboardWidgets>(() => loadFromStorage());
  // SSR 안전: 서버/클라이언트 초기값 일치시킨 후, useEffect에서 localStorage 동기화
  const [dashboardView, setDashboardViewState] = useState<DashboardView>('detail');

  // SSR hydration 동기화: dashboardView만 클라이언트에서 갱신 (widgets는 useState 초기화로 처리)
  useEffect(() => {
    setDashboardViewState(loadViewFromStorage());
  }, []);

  const toggleWidget = useCallback((key: WidgetKey) => {
    setWidgets((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveToStorage(next);
      return next;
    });
  }, []);

  const resetDefaults = useCallback(() => {
    const defaults = { ...DEFAULT_WIDGETS };
    saveToStorage(defaults);
    setWidgets(defaults);
  }, []);

  const setDashboardView = useCallback((view: DashboardView) => {
    setDashboardViewState(view);
    try { window.localStorage.setItem(VIEW_STORAGE_KEY, view); } catch { /* ignore */ }
  }, []);

  return { widgets, toggleWidget, resetDefaults, dashboardView, setDashboardView };
}
