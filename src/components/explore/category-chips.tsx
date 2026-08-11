'use client';

import { cn } from '@/lib/utils';
import { useExploreCategories, type ExploreCategoryKey } from '@/lib/hooks/use-explore';

interface CategoryChipsProps {
  selected: ExploreCategoryKey;
  onChange: (category: ExploreCategoryKey) => void;
}

/** '전체' + 실제 카테고리 이름 → 칩 목록 (순수 함수, 테스트 대상) */
export function buildChips(
  categories: { name: string; count: number }[]
): { key: ExploreCategoryKey; label: string }[] {
  return [
    { key: 'all', label: '전체' },
    ...categories.map((c) => ({ key: c.name, label: c.name })),
  ];
}

/** 칩 목록은 공개 클립의 실제 카테고리 집계에서 동적으로 온다. */
export function CategoryChips({ selected, onChange }: CategoryChipsProps) {
  const { data: categories = [] } = useExploreCategories();
  const chips = buildChips(categories);

  return (
    <div className="relative">
      {/* 모바일: 수평 스크롤 / 데스크탑: 래핑 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap sm:overflow-visible sm:pb-0">
        {chips.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              'inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              selected === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface text-muted hover:bg-surface-hover hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
