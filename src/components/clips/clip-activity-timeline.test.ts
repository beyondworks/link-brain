/**
 * formatRelativeTime unit tests.
 *
 * clip-activity-timeline.tsx에서 export된 순수 함수.
 * Date.now()를 vi.setSystemTime으로 고정해 결정론적 테스트 보장.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatRelativeTime } from './clip-activity-timeline';

// 기준 시각: 2026-03-03T12:00:00.000Z
const BASE_TIME = new Date('2026-03-03T12:00:00.000Z').getTime();

function msAgo(ms: number): string {
  return new Date(BASE_TIME - ms).toISOString();
}

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1분 이내 → "방금 전"', () => {
    it('0초 전 (현재 시각)', () => {
      expect(formatRelativeTime(msAgo(0))).toBe('방금 전');
    });

    it('30초 전', () => {
      expect(formatRelativeTime(msAgo(30 * SEC))).toBe('방금 전');
    });

    it('59초 전 (경계값)', () => {
      expect(formatRelativeTime(msAgo(59 * SEC))).toBe('방금 전');
    });
  });

  describe('1시간 이내 → "N분 전"', () => {
    it('1분 전 (경계값)', () => {
      expect(formatRelativeTime(msAgo(1 * MIN))).toBe('1분 전');
    });

    it('5분 전', () => {
      expect(formatRelativeTime(msAgo(5 * MIN))).toBe('5분 전');
    });

    it('30분 전', () => {
      expect(formatRelativeTime(msAgo(30 * MIN))).toBe('30분 전');
    });

    it('59분 전 (경계값)', () => {
      expect(formatRelativeTime(msAgo(59 * MIN))).toBe('59분 전');
    });
  });

  describe('24시간 이내 → "N시간 전"', () => {
    it('1시간 전 (경계값)', () => {
      expect(formatRelativeTime(msAgo(1 * HOUR))).toBe('1시간 전');
    });

    it('6시간 전', () => {
      expect(formatRelativeTime(msAgo(6 * HOUR))).toBe('6시간 전');
    });

    it('23시간 전 (경계값)', () => {
      expect(formatRelativeTime(msAgo(23 * HOUR))).toBe('23시간 전');
    });
  });

  describe('7일 이내 → "N일 전" 또는 "어제"', () => {
    it('1일 전 → "어제"', () => {
      expect(formatRelativeTime(msAgo(1 * DAY))).toBe('어제');
    });

    it('2일 전', () => {
      expect(formatRelativeTime(msAgo(2 * DAY))).toBe('2일 전');
    });

    it('6일 전 (경계값)', () => {
      expect(formatRelativeTime(msAgo(6 * DAY))).toBe('6일 전');
    });
  });

  describe('7일 초과 → 날짜 표시 (ko-KR short)', () => {
    it('7일 전 → 날짜 문자열 반환', () => {
      const result = formatRelativeTime(msAgo(7 * DAY));
      // ko-KR DateTimeFormat: "2월 24일" 형태
      expect(result).toMatch(/\d+월\s+\d+일/);
    });

    it('30일 전 → 날짜 문자열 반환', () => {
      const result = formatRelativeTime(msAgo(30 * DAY));
      expect(result).toMatch(/\d+월\s+\d+일/);
    });

    it('1년 전 → 날짜 문자열 반환', () => {
      const result = formatRelativeTime(msAgo(365 * DAY));
      expect(result).toMatch(/\d+월\s+\d+일/);
    });
  });

  describe('경계값 정밀도', () => {
    it('60초 정확히 = 1분 전', () => {
      expect(formatRelativeTime(msAgo(60 * SEC))).toBe('1분 전');
    });

    it('3600초 정확히 = 1시간 전', () => {
      expect(formatRelativeTime(msAgo(60 * MIN))).toBe('1시간 전');
    });

    it('86400초 정확히 = 어제 (1 * DAY)', () => {
      expect(formatRelativeTime(msAgo(24 * HOUR))).toBe('어제');
    });
  });
});
