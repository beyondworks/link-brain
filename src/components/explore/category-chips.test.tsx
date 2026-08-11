/**
 * CategoryChips logic unit tests (node environment, no DOM renderer).
 * 칩 목록은 하드코딩이 아니라 공개 클립의 실제 카테고리 집계에서 온다.
 */
import { describe, it, expect } from 'vitest';
import { buildChips } from './category-chips';

describe('buildChips', () => {
  it('전체가 항상 첫 칩이다', () => {
    expect(buildChips([])[0]).toEqual({ key: 'all', label: '전체' });
  });

  it('서버 집계 카테고리 이름이 그대로 칩이 된다 (실데이터 이름 매칭)', () => {
    const chips = buildChips([
      { name: 'Design', count: 118 },
      { name: 'Dev', count: 90 },
      { name: 'AI', count: 60 },
    ]);
    expect(chips.map((c) => c.key)).toEqual(['all', 'Design', 'Dev', 'AI']);
    expect(chips.map((c) => c.label)).toEqual(['전체', 'Design', 'Dev', 'AI']);
  });

  it('카테고리가 없으면 전체만 남는다', () => {
    expect(buildChips([])).toHaveLength(1);
  });
});
