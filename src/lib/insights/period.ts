/**
 * Insights period math (pure, shared by the API route and the client).
 *
 * Windows are rolling for 주/월 (last 7 / 30 days) and calendar-anchored for 연
 * (the current month plus the 11 before it, so the chart shows 12 clean months).
 * Every bucket key is UTC so server and client agree.
 */

export const INSIGHTS_PERIODS = ['week', 'month', 'year'] as const;
export type InsightsPeriod = (typeof INSIGHTS_PERIODS)[number];
export type InsightsGranularity = 'daily' | 'monthly';

export interface PeriodRange {
  /** Inclusive start of the selected window */
  from: Date;
  /** Exclusive end of the selected window (now) */
  to: Date;
  /** Inclusive start of the preceding comparison window */
  prevFrom: Date;
  /** Exclusive end of the preceding window (=== from) */
  prevTo: Date;
}

export interface ActivityBucket {
  /** 'YYYY-MM-DD' when daily, 'YYYY-MM' when monthly */
  bucket: string;
  saved: number;
  read: number;
}

/** Sparse day rows as returned by get_insights_stats */
export interface DailyActivityRow {
  date: string;
  saved: number;
  read: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const PERIOD_LABELS: Record<InsightsPeriod, string> = {
  week: '주',
  month: '월',
  year: '연',
};

export const PERIOD_RANGE_LABELS: Record<InsightsPeriod, string> = {
  week: '최근 7일',
  month: '최근 30일',
  year: '최근 12개월',
};

export function parsePeriod(value: string | null | undefined): InsightsPeriod {
  return INSIGHTS_PERIODS.includes(value as InsightsPeriod) ? (value as InsightsPeriod) : 'month';
}

export function periodGranularity(period: InsightsPeriod): InsightsGranularity {
  return period === 'year' ? 'monthly' : 'daily';
}

/** Rolling day count for 주/월; 연 is calendar-anchored instead. */
export function periodDays(period: InsightsPeriod): number {
  return period === 'week' ? 7 : 30;
}

export function resolvePeriodRange(period: InsightsPeriod, now: Date = new Date()): PeriodRange {
  if (period === 'year') {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const prevFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 23, 1));
    return { from, to: now, prevFrom, prevTo: from };
  }

  const span = periodDays(period) * DAY_MS;
  const from = new Date(now.getTime() - span);
  return { from, to: now, prevFrom: new Date(from.getTime() - span), prevTo: from };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Ordered, gap-free bucket keys for the selected period. */
export function periodBuckets(period: InsightsPeriod, range: PeriodRange): string[] {
  if (period === 'year') {
    const year = range.from.getUTCFullYear();
    const month = range.from.getUTCMonth();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.UTC(year, month + i, 1));
      return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
    });
  }

  const days = periodDays(period);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(range.to.getTime() - (days - 1 - i) * DAY_MS);
    return d.toISOString().slice(0, 10);
  });
}

/** Roll sparse daily rows into the period's buckets, filling zeros. */
export function buildActivitySeries(
  rows: DailyActivityRow[],
  period: InsightsPeriod,
  range: PeriodRange
): ActivityBucket[] {
  const keyLength = periodGranularity(period) === 'monthly' ? 7 : 10;
  const totals = new Map<string, { saved: number; read: number }>();

  for (const row of rows) {
    const key = row.date.slice(0, keyLength);
    const current = totals.get(key) ?? { saved: 0, read: 0 };
    current.saved += row.saved;
    current.read += row.read;
    totals.set(key, current);
  }

  return periodBuckets(period, range).map((bucket) => ({
    bucket,
    saved: totals.get(bucket)?.saved ?? 0,
    read: totals.get(bucket)?.read ?? 0,
  }));
}

/**
 * Percentage change vs the previous window.
 * Returns null when there is no baseline (previous = 0) — the caller renders
 * "신규" instead of a meaningless +Infinity%.
 */
export function changePercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Short axis label for a bucket key. */
export function formatBucketLabel(bucket: string): string {
  if (bucket.length === 7) {
    const [, month] = bucket.split('-');
    return `${Number(month)}월`;
  }
  const [, month, day] = bucket.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

/** "3주째 안 읽음" style nudge for an unread clip. */
export function unreadAgeLabel(createdAt: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(createdAt).getTime()) / DAY_MS);
  if (days <= 0) return '오늘 저장';
  if (days < 7) return `${days}일째 안 읽음`;
  if (days < 30) return `${Math.floor(days / 7)}주째 안 읽음`;
  return `${Math.floor(days / 30)}개월째 안 읽음`;
}
