'use client';

import { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useCategories } from '@/lib/hooks/use-categories';
import { useCollections } from '@/lib/hooks/use-collections';
import type { ClipPlatform } from '@/types/database';
import type { ReadStatus } from '@/types/clip';

const PLATFORM_LIST: ClipPlatform[] = [
  'web', 'youtube', 'twitter', 'github', 'medium', 'reddit', 'substack', 'linkedin',
];

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'Twitter',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  medium: 'Medium',
  substack: 'Substack',
  reddit: 'Reddit',
  web: 'Web',
  other: '기타',
};

const DATE_PRESETS: { label: string; from: string; to: string }[] = [
  {
    label: '오늘',
    from: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    to: new Date().toISOString(),
  },
  {
    label: '이번 주',
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
  },
  {
    label: '이번 달',
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
  },
  {
    label: '최근 3개월',
    from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
  },
];

const READ_STATUS_OPTIONS: { value: ReadStatus; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'read', label: '읽음' },
  { value: 'unread', label: '안읽음' },
];

const SECTION_LABEL =
  'text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60 mb-2';

const CHIP_BASE =
  'rounded-full border px-2.5 py-1 text-xs transition-spring';
const CHIP_ACTIVE =
  'border-primary bg-primary text-white';
const CHIP_IDLE =
  'border-border/60 text-muted-foreground hover:border-primary/40';

export function AdvancedFilters() {
  const [open, setOpen] = useState(false);
  const { filters, setFilter, clearFilters } = useUIStore();
  const { data: categories = [] } = useCategories();
  const { data: collections = [] } = useCollections();

  const selectedCategory = categories.find((c) => c.id === filters.categoryId);
  const selectedCollection = collections.find((c) => c.id === filters.collectionId);

  const activePreset = filters.dateRange
    ? DATE_PRESETS.find((p) => p.from === filters.dateRange?.from) ?? null
    : null;

  const activeCount = [
    filters.platform !== null,
    filters.categoryId !== null,
    filters.collectionId !== null,
    filters.isFavorite === true,
    filters.dateRange !== null,
    filters.readStatus !== null && filters.readStatus !== 'all',
    filters.hasAiAnalysis !== null,
  ].filter(Boolean).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'relative gap-1.5 rounded-xl border transition-spring',
            open
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground',
          )}
        >
          <SlidersHorizontal size={14} />
          <span className="hidden sm:inline text-sm">필터</span>
          {activeCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-72 rounded-2xl border-border/60 bg-glass-heavy p-4 shadow-elevated"
      >
        <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-0.5">

          {/* Platform */}
          <div>
            <p className={SECTION_LABEL}>플랫폼</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilter('platform', null)}
                className={cn(CHIP_BASE, filters.platform === null ? CHIP_ACTIVE : CHIP_IDLE)}
              >
                전체
              </button>
              {PLATFORM_LIST.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilter('platform', p)}
                  className={cn(CHIP_BASE, filters.platform === p ? CHIP_ACTIVE : CHIP_IDLE)}
                >
                  {PLATFORM_LABELS[p] ?? p}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <p className={SECTION_LABEL}>카테고리</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground transition-spring hover:border-primary/30"
                >
                  <span className="flex items-center gap-2">
                    {selectedCategory ? (
                      <>
                        {selectedCategory.color && (
                          <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: selectedCategory.color }}
                          />
                        )}
                        <span className="truncate">{selectedCategory.name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">전체</span>
                    )}
                  </span>
                  <ChevronDown size={13} className="flex-shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => setFilter('categoryId', null)}>
                  <span className="text-muted-foreground">전체</span>
                </DropdownMenuItem>
                {categories.map((cat) => (
                  <DropdownMenuItem
                    key={cat.id}
                    onClick={() => setFilter('categoryId', cat.id)}
                    className="flex items-center gap-2"
                  >
                    {cat.color && (
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                    <span className="truncate">{cat.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Collection */}
          <div>
            <p className={SECTION_LABEL}>컬렉션</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground transition-spring hover:border-primary/30"
                >
                  <span className="flex items-center gap-2">
                    {selectedCollection ? (
                      <>
                        {selectedCollection.color && (
                          <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: selectedCollection.color }}
                          />
                        )}
                        <span className="truncate">{selectedCollection.name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">전체</span>
                    )}
                  </span>
                  <ChevronDown size={13} className="flex-shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => setFilter('collectionId', null)}>
                  <span className="text-muted-foreground">전체</span>
                </DropdownMenuItem>
                {collections.map((col) => (
                  <DropdownMenuItem
                    key={col.id}
                    onClick={() => setFilter('collectionId', col.id)}
                    className="flex items-center gap-2"
                  >
                    {col.color && (
                      <span
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: col.color }}
                      />
                    )}
                    <span className="truncate">{col.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Date range presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={cn(SECTION_LABEL, 'mb-0')}>저장 날짜</p>
              {filters.dateRange && (
                <button
                  type="button"
                  onClick={() => setFilter('dateRange', null)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-spring"
                >
                  초기화
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((preset) => {
                const isActive = activePreset?.label === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      setFilter('dateRange', isActive ? null : { from: preset.from, to: preset.to })
                    }
                    className={cn(CHIP_BASE, isActive ? CHIP_ACTIVE : CHIP_IDLE)}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Read status */}
          <div>
            <p className={SECTION_LABEL}>읽음 상태</p>
            <div className="flex gap-1.5">
              {READ_STATUS_OPTIONS.map((opt) => {
                const current = filters.readStatus ?? 'all';
                const isActive = current === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setFilter('readStatus', opt.value === 'all' ? null : opt.value)
                    }
                    className={cn(CHIP_BASE, isActive ? CHIP_ACTIVE : CHIP_IDLE)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI analysis */}
          <div>
            <p className={SECTION_LABEL}>AI 분석</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setFilter('hasAiAnalysis', null)}
                className={cn(CHIP_BASE, filters.hasAiAnalysis === null ? CHIP_ACTIVE : CHIP_IDLE)}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setFilter('hasAiAnalysis', true)}
                className={cn(CHIP_BASE, filters.hasAiAnalysis === true ? CHIP_ACTIVE : CHIP_IDLE)}
              >
                분석 완료
              </button>
              <button
                type="button"
                onClick={() => setFilter('hasAiAnalysis', false)}
                className={cn(CHIP_BASE, filters.hasAiAnalysis === false ? CHIP_ACTIVE : CHIP_IDLE)}
              >
                미분석
              </button>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground transition-spring"
            onClick={clearFilters}
          >
            <X size={13} />
            전체 초기화
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground transition-spring"
            onClick={() => setOpen(false)}
          >
            닫기
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
