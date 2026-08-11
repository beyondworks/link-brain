import { describe, it, expect } from 'vitest';
import {
  parsePeriod,
  periodGranularity,
  resolvePeriodRange,
  periodBuckets,
  buildActivitySeries,
  changePercent,
  formatBucketLabel,
  unreadAgeLabel,
} from './period';

const NOW = new Date('2026-08-11T09:30:00.000Z');

describe('parsePeriod', () => {
  it('accepts the three supported periods', () => {
    expect(parsePeriod('week')).toBe('week');
    expect(parsePeriod('month')).toBe('month');
    expect(parsePeriod('year')).toBe('year');
  });

  it('falls back to month for unknown / missing values', () => {
    expect(parsePeriod(null)).toBe('month');
    expect(parsePeriod('quarter')).toBe('month');
  });
});

describe('periodGranularity', () => {
  it('is daily for week/month and monthly for year', () => {
    expect(periodGranularity('week')).toBe('daily');
    expect(periodGranularity('month')).toBe('daily');
    expect(periodGranularity('year')).toBe('monthly');
  });
});

describe('resolvePeriodRange', () => {
  it('rolls back 7 days for week, with an equal previous window', () => {
    const r = resolvePeriodRange('week', NOW);
    expect(r.from.toISOString()).toBe('2026-08-04T09:30:00.000Z');
    expect(r.prevFrom.toISOString()).toBe('2026-07-28T09:30:00.000Z');
    expect(r.prevTo).toEqual(r.from);
  });

  it('rolls back 30 days for month', () => {
    const r = resolvePeriodRange('month', NOW);
    expect(r.from.toISOString()).toBe('2026-07-12T09:30:00.000Z');
  });

  it('anchors year to the first of the month 11 months back', () => {
    const r = resolvePeriodRange('year', NOW);
    expect(r.from.toISOString()).toBe('2025-09-01T00:00:00.000Z');
    expect(r.prevFrom.toISOString()).toBe('2024-09-01T00:00:00.000Z');
  });
});

describe('periodBuckets', () => {
  it('produces 7 daily buckets ending today for week', () => {
    const range = resolvePeriodRange('week', NOW);
    const buckets = periodBuckets('week', range);
    expect(buckets).toHaveLength(7);
    expect(buckets[0]).toBe('2026-08-05');
    expect(buckets[6]).toBe('2026-08-11');
  });

  it('produces 30 daily buckets for month', () => {
    expect(periodBuckets('month', resolvePeriodRange('month', NOW))).toHaveLength(30);
  });

  it('produces 12 monthly buckets for year', () => {
    const buckets = periodBuckets('year', resolvePeriodRange('year', NOW));
    expect(buckets).toHaveLength(12);
    expect(buckets[0]).toBe('2025-09');
    expect(buckets[11]).toBe('2026-08');
  });
});

describe('buildActivitySeries', () => {
  it('fills gaps with zeros and keeps bucket order', () => {
    const range = resolvePeriodRange('week', NOW);
    const series = buildActivitySeries(
      [{ date: '2026-08-11', saved: 3, read: 1 }],
      'week',
      range
    );
    expect(series).toHaveLength(7);
    expect(series[6]).toEqual({ bucket: '2026-08-11', saved: 3, read: 1 });
    expect(series[0]).toEqual({ bucket: '2026-08-05', saved: 0, read: 0 });
  });

  it('rolls daily rows up into monthly buckets for year', () => {
    const range = resolvePeriodRange('year', NOW);
    const series = buildActivitySeries(
      [
        { date: '2026-08-01', saved: 2, read: 0 },
        { date: '2026-08-09', saved: 5, read: 4 },
        { date: '2026-07-02', saved: 1, read: 1 },
      ],
      'year',
      range
    );
    const august = series.find((b) => b.bucket === '2026-08');
    expect(august).toEqual({ bucket: '2026-08', saved: 7, read: 4 });
    expect(series.find((b) => b.bucket === '2026-07')).toEqual({
      bucket: '2026-07',
      saved: 1,
      read: 1,
    });
  });

  it('drops rows outside the window (no phantom buckets)', () => {
    const range = resolvePeriodRange('week', NOW);
    const series = buildActivitySeries([{ date: '2020-01-01', saved: 9, read: 9 }], 'week', range);
    expect(series.every((b) => b.saved === 0 && b.read === 0)).toBe(true);
  });
});

describe('changePercent', () => {
  it('computes rounded percentage change', () => {
    expect(changePercent(56, 50)).toBe(12);
    expect(changePercent(40, 50)).toBe(-20);
    expect(changePercent(50, 50)).toBe(0);
  });

  it('returns null when there is no baseline', () => {
    expect(changePercent(10, 0)).toBeNull();
    expect(changePercent(0, 0)).toBeNull();
  });
});

describe('formatBucketLabel', () => {
  it('formats daily and monthly keys', () => {
    expect(formatBucketLabel('2026-08-11')).toBe('8월 11일');
    expect(formatBucketLabel('2026-08')).toBe('8월');
  });
});

describe('unreadAgeLabel', () => {
  it('escalates from days to weeks to months', () => {
    expect(unreadAgeLabel('2026-08-11T00:00:00.000Z', NOW)).toBe('오늘 저장');
    expect(unreadAgeLabel('2026-08-08T00:00:00.000Z', NOW)).toBe('3일째 안 읽음');
    expect(unreadAgeLabel('2026-07-21T00:00:00.000Z', NOW)).toBe('3주째 안 읽음');
    expect(unreadAgeLabel('2026-05-01T00:00:00.000Z', NOW)).toBe('3개월째 안 읽음');
  });
});
