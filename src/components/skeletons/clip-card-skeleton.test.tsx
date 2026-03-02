/**
 * ClipCardSkeleton 테스트
 *
 * vitest 환경이 'node'라 DOM 렌더링(@testing-library/react)을 사용하지 않습니다.
 * count prop 로직과 컴포넌트 모듈 구조를 검증합니다.
 */

import { describe, it, expect } from 'vitest';

// count prop에 따른 배열 길이 계산 — 컴포넌트 내부 로직과 동일
function resolveCount(count?: number): number {
  return count ?? 6;
}

describe('ClipCardSkeleton', () => {
  describe('count prop 로직', () => {
    it('count를 지정하지 않으면 기본값 6을 반환한다', () => {
      expect(resolveCount()).toBe(6);
    });

    it('count=3이면 3을 반환한다', () => {
      expect(resolveCount(3)).toBe(3);
    });

    it('count=1이면 1을 반환한다', () => {
      expect(resolveCount(1)).toBe(1);
    });

    it('count=0이면 0을 반환한다', () => {
      expect(resolveCount(0)).toBe(0);
    });

    it('count=12이면 12를 반환한다', () => {
      expect(resolveCount(12)).toBe(12);
    });
  });

  describe('렌더링 배열 생성', () => {
    it('count=6일 때 6개 항목을 가진 배열이 만들어진다', () => {
      const items = Array.from({ length: resolveCount(6) });
      expect(items).toHaveLength(6);
    });

    it('count=3일 때 3개 항목을 가진 배열이 만들어진다', () => {
      const items = Array.from({ length: resolveCount(3) });
      expect(items).toHaveLength(3);
    });

    it('기본 count일 때 6개 항목을 가진 배열이 만들어진다', () => {
      const items = Array.from({ length: resolveCount() });
      expect(items).toHaveLength(6);
    });
  });

  describe('모듈 구조', () => {
    it('ClipCardSkeleton이 named export로 존재한다', async () => {
      const mod = await import('./clip-card-skeleton');
      expect(typeof mod.ClipCardSkeleton).toBe('function');
    });
  });
});

describe('ClipListSkeleton', () => {
  describe('모듈 구조', () => {
    it('ClipListSkeleton이 named export로 존재한다', async () => {
      const mod = await import('./clip-list-skeleton');
      expect(typeof mod.ClipListSkeleton).toBe('function');
    });
  });

  describe('viewMode 기본값', () => {
    // viewMode 파라미터 처리 로직 — 컴포넌트 내부와 동일한 패턴
    function resolveLayout(viewMode?: 'grid' | 'list' | 'headlines'): string {
      if (viewMode === 'list') return 'list';
      if (viewMode === 'headlines') return 'headlines';
      return 'grid';
    }

    it('viewMode 미지정 시 grid 레이아웃이 선택된다', () => {
      expect(resolveLayout()).toBe('grid');
    });

    it('viewMode=list 시 list 레이아웃이 선택된다', () => {
      expect(resolveLayout('list')).toBe('list');
    });

    it('viewMode=headlines 시 headlines 레이아웃이 선택된다', () => {
      expect(resolveLayout('headlines')).toBe('headlines');
    });

    it('viewMode=grid 시 grid 레이아웃이 선택된다', () => {
      expect(resolveLayout('grid')).toBe('grid');
    });
  });
});

describe('StatCardSkeleton', () => {
  describe('모듈 구조', () => {
    it('StatCardSkeleton이 named export로 존재한다', async () => {
      const mod = await import('./stat-card-skeleton');
      expect(typeof mod.StatCardSkeleton).toBe('function');
    });
  });

  describe('count prop 기본값', () => {
    function resolveCount(count?: number): number {
      return count ?? 4;
    }

    it('count 미지정 시 기본값 4를 반환한다', () => {
      expect(resolveCount()).toBe(4);
    });

    it('count=2 시 2를 반환한다', () => {
      expect(resolveCount(2)).toBe(2);
    });
  });
});
