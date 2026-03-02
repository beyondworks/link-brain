/**
 * weekly-report 유틸 함수 단위 테스트
 *
 * vitest (environment: 'node') — DOM 없이 순수 함수만 검증합니다.
 */

import { describe, it, expect } from 'vitest';
import { calcChangeRate } from './weekly-report';

describe('calcChangeRate', () => {
  // ─── 기본 케이스 ─────────────────────────────────────────────────────────

  it('지난 주와 이번 주 모두 0이면 0% 반환', () => {
    expect(calcChangeRate(0, 0)).toBe(0);
  });

  it('지난 주가 0이고 이번 주가 양수이면 100% 반환', () => {
    expect(calcChangeRate(5, 0)).toBe(100);
  });

  it('동일한 값이면 0% 반환', () => {
    expect(calcChangeRate(10, 10)).toBe(0);
  });

  // ─── 양수 변화 ────────────────────────────────────────────────────────────

  it('지난 주 10 → 이번 주 15: +50% 반환', () => {
    expect(calcChangeRate(15, 10)).toBe(50);
  });

  it('지난 주 4 → 이번 주 6: +50% 반환', () => {
    expect(calcChangeRate(6, 4)).toBe(50);
  });

  it('지난 주 1 → 이번 주 2: +100% 반환', () => {
    expect(calcChangeRate(2, 1)).toBe(100);
  });

  // ─── 음수 변화 ────────────────────────────────────────────────────────────

  it('지난 주 10 → 이번 주 5: -50% 반환', () => {
    expect(calcChangeRate(5, 10)).toBe(-50);
  });

  it('지난 주 3 → 이번 주 0: -100% 반환', () => {
    expect(calcChangeRate(0, 3)).toBe(-100);
  });

  it('지난 주 6 → 이번 주 4: -33% 반환 (Math.round)', () => {
    expect(calcChangeRate(4, 6)).toBe(-33);
  });

  // ─── 반올림 ───────────────────────────────────────────────────────────────

  it('소수점 결과는 반올림됨: 지난 주 3 → 이번 주 4 → +33%', () => {
    expect(calcChangeRate(4, 3)).toBe(33);
  });

  it('지난 주 7 → 이번 주 10: +43%', () => {
    expect(calcChangeRate(10, 7)).toBe(43);
  });
});

// ─── 스타일 클래스 결정 로직 검증 ────────────────────────────────────────────
//
// MetricCard 내부 trendConfig 로직을 calcChangeRate 반환값 기준으로 검증합니다.
// 실제 렌더링 없이 변화율 분기만 확인합니다.

describe('변화율에 따른 스타일 분기', () => {
  function getTrend(thisWeek: number, lastWeek: number): 'positive' | 'negative' | 'neutral' {
    const rate = calcChangeRate(thisWeek, lastWeek);
    if (rate > 0) return 'positive';
    if (rate < 0) return 'negative';
    return 'neutral';
  }

  it('증가 시 positive 분기', () => {
    expect(getTrend(10, 5)).toBe('positive');
  });

  it('감소 시 negative 분기', () => {
    expect(getTrend(3, 8)).toBe('negative');
  });

  it('변화 없음 시 neutral 분기', () => {
    expect(getTrend(7, 7)).toBe('neutral');
  });

  it('지난 주 0, 이번 주 0 시 neutral 분기', () => {
    expect(getTrend(0, 0)).toBe('neutral');
  });

  it('지난 주 0, 이번 주 양수 시 positive 분기', () => {
    expect(getTrend(3, 0)).toBe('positive');
  });
});
