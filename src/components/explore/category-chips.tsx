'use client';

import { cn } from '@/lib/utils';
import { EXPLORE_CATEGORIES, type ExploreCategoryKey } from '@/lib/hooks/use-explore';

interface CategoryChipsProps {
  selected: ExploreCategoryKey;
  onChange: (category: ExploreCategoryKey) => void;
}

export function CategoryChips({ selected, onChange }: CategoryChipsProps) {
  return (
    <div className="relative">
      {/* 모바일: 수평 스크롤 / 데스크탑: 래핑 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap sm:overflow-visible sm:pb-0">
        {EXPLORE_CATEGORIES.map(({ key, label }) => (
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
