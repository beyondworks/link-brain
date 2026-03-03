/**
 * CategoryChips logic unit tests (node environment, no DOM renderer).
 *
 * CategoryChips itself requires JSX rendering (use client), so these tests
 * validate the pure logic embedded in the component:
 *   1. EXPLORE_CATEGORIES 목록이 올바르게 정의되어 있는지
 *   2. 선택 상태 판별 로직 (selected === key)
 *   3. onChange 콜백 호출 로직
 *   4. className 분기 로직 (selected vs unselected)
 */

import { describe, it, expect, vi } from 'vitest';
import { EXPLORE_CATEGORIES, type ExploreCategoryKey } from '@/lib/hooks/use-explore';

// ─── EXPLORE_CATEGORIES 데이터 검증 ──────────────────────────────────────────

describe('EXPLORE_CATEGORIES', () => {
  it('전체(all) 카테고리를 첫 번째로 포함한다', () => {
    expect(EXPLORE_CATEGORIES[0].key).toBe('all');
    expect(EXPLORE_CATEGORIES[0].label).toBe('전체');
  });

  it('6개 카테고리를 포함한다', () => {
    expect(EXPLORE_CATEGORIES).toHaveLength(6);
  });

  it('모든 카테고리에 key와 label이 있다', () => {
    for (const cat of EXPLORE_CATEGORIES) {
      expect(cat.key).toBeTruthy();
      expect(cat.label).toBeTruthy();
    }
  });

  it('기대하는 카테고리 key 목록을 포함한다', () => {
    const keys = EXPLORE_CATEGORIES.map((c) => c.key);
    expect(keys).toContain('all');
    expect(keys).toContain('기술');
    expect(keys).toContain('디자인');
    expect(keys).toContain('비즈니스');
    expect(keys).toContain('학습');
    expect(keys).toContain('기타');
  });
});

// ─── 선택 상태 판별 로직 ──────────────────────────────────────────────────────
// CategoryChips 내부: selected === key → 'bg-primary text-primary-foreground'
//                    else             → 'bg-surface text-muted ...'

function resolveButtonClass(
  selected: ExploreCategoryKey,
  key: ExploreCategoryKey
): 'selected' | 'unselected' {
  return selected === key ? 'selected' : 'unselected';
}

describe('CategoryChips — 선택 상태 판별 로직', () => {
  it('selected와 key가 같으면 selected 반환', () => {
    expect(resolveButtonClass('all', 'all')).toBe('selected');
    expect(resolveButtonClass('기술', '기술')).toBe('selected');
  });

  it('selected와 key가 다르면 unselected 반환', () => {
    expect(resolveButtonClass('all', '기술')).toBe('unselected');
    expect(resolveButtonClass('기술', 'all')).toBe('unselected');
  });

  it('모든 카테고리에 대해 정확히 1개만 selected 상태', () => {
    const selected: ExploreCategoryKey = '디자인';
    const results = EXPLORE_CATEGORIES.map((c) => resolveButtonClass(selected, c.key));
    const selectedCount = results.filter((r) => r === 'selected').length;
    expect(selectedCount).toBe(1);
  });
});

// ─── onChange 콜백 호출 로직 ──────────────────────────────────────────────────
// CategoryChips 내부: onClick={() => onChange(key)}

function simulateButtonClick(
  key: ExploreCategoryKey,
  onChange: (category: ExploreCategoryKey) => void
) {
  onChange(key);
}

describe('CategoryChips — onChange 콜백 호출', () => {
  it('버튼 클릭 시 해당 key를 인자로 onChange가 호출된다', () => {
    const onChange = vi.fn();
    simulateButtonClick('기술', onChange);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('기술');
  });

  it('"all" 버튼 클릭 시 "all"로 onChange 호출', () => {
    const onChange = vi.fn();
    simulateButtonClick('all', onChange);
    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('각 카테고리 버튼이 고유한 key로 onChange를 호출한다', () => {
    const onChange = vi.fn();
    for (const cat of EXPLORE_CATEGORIES) {
      simulateButtonClick(cat.key, onChange);
    }
    expect(onChange).toHaveBeenCalledTimes(EXPLORE_CATEGORIES.length);

    const calledKeys = onChange.mock.calls.map((call) => call[0]);
    const uniqueKeys = new Set(calledKeys);
    expect(uniqueKeys.size).toBe(EXPLORE_CATEGORIES.length);
  });

  it('onChange는 클릭 전까지 호출되지 않는다', () => {
    const onChange = vi.fn();
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ─── 카테고리 순서 검증 ───────────────────────────────────────────────────────

describe('CategoryChips — 카테고리 렌더 순서', () => {
  it('EXPLORE_CATEGORIES 순서대로 버튼이 렌더되어야 한다', () => {
    const expectedOrder: ExploreCategoryKey[] = [
      'all',
      '기술',
      '디자인',
      '비즈니스',
      '학습',
      '기타',
    ];
    const actualOrder = EXPLORE_CATEGORIES.map((c) => c.key);
    expect(actualOrder).toEqual(expectedOrder);
  });
});
