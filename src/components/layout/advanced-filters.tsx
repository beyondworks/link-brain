'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { useCategories } from '@/lib/hooks/use-categories';
import { useCollections } from '@/lib/hooks/use-collections';
import type { ClipPlatform } from '@/types/database';

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

const SECTION_LABEL = 'text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60 mb-2';

export function AdvancedFilters() {
  const [open, setOpen] = useState(false);
  const { filters, setFilter, clearFilters } = useUIStore();
  const { data: categories = [] } = useCategories();
  const { data: collections = [] } = useCollections();

  const activeCount = [
    filters.platform !== null,
    filters.categoryId !== null,
    filters.collectionId !== null,
    filters.isFavorite === true,
  ].filter(Boolean).length;

  const selectedCategory = categories.find((c) => c.id === filters.categoryId);
  const selectedCollection = collections.find((c) => c.id === filters.collectionId);

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
        {/* Platform */}
        <div className="mb-4">
          <p className={SECTION_LABEL}>플랫폼</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilter('platform', null)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-spring',
                filters.platform === null
                  ? 'border-primary bg-primary text-white'
                  : 'border-border/60 text-muted-foreground hover:border-primary/40',
              )}
            >
              전체
            </button>
            {PLATFORM_LIST.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFilter('platform', p)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-spring',
                  filters.platform === p
                    ? 'border-primary bg-primary text-white'
                    : 'border-border/60 text-muted-foreground hover:border-primary/40',
                )}
              >
                {PLATFORM_LABELS[p] ?? p}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="mb-4">
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
        <div className="mb-4">
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

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-border/40 pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground transition-spring"
            onClick={clearFilters}
          >
            <X size={13} />
            초기화
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
