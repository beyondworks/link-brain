'use client';

import { Search, Grid3X3, List, Newspaper, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUIStore } from '@/stores/ui-store';
import { SORT_OPTIONS, VIEW_MODES } from '@/config/constants';
import type { ViewMode } from '@/config/constants';
import type { ClipSortBy } from '@/types/clip';

interface AppHeaderProps {
  title?: string;
  titleKo?: string;
}

const VIEW_MODE_ICONS: Record<ViewMode, React.ReactNode> = {
  grid: <Grid3X3 size={16} />,
  list: <List size={16} />,
  headlines: <Newspaper size={16} />,
};

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  grid: '그리드',
  list: '리스트',
  headlines: '헤드라인',
};

export function AppHeader({ title, titleKo }: AppHeaderProps) {
  const {
    viewMode,
    setViewMode,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    openModal,
    setOmniSearchOpen,
  } = useUIStore();

  const currentSortOption = SORT_OPTIONS.find((o) => o.value === sortBy);

  const handleSortSelect = (value: string) => {
    if (value === sortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(value as ClipSortBy);
      setSortOrder('desc');
    }
  };

  return (
    <header className="flex h-14 items-center gap-2 border-b border-border bg-background px-4">
        {/* Title (desktop) */}
        {(title || titleKo) && (
          <h1 className="mr-2 hidden text-base font-semibold text-foreground lg:block">
            {titleKo ?? title}
          </h1>
        )}

        {/* Search trigger */}
        <Button
          variant="outline"
          className="hidden h-9 flex-1 max-w-sm justify-start gap-2 text-muted-foreground lg:flex"
          onClick={() => setOmniSearchOpen(true)}
        >
          <Search size={15} />
          <span className="text-sm">검색...</span>
          <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:block">
            ⌘K
          </kbd>
        </Button>

        <div className="ml-auto flex items-center gap-1">
          {/* View mode toggles - desktop only */}
          <div className="hidden items-center rounded-md border border-border bg-muted/30 p-0.5 lg:flex">
            {VIEW_MODES.map((mode) => (
              <Tooltip key={mode}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={[
                      'flex h-7 w-7 items-center justify-center rounded transition-colors',
                      viewMode === mode
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                    aria-label={VIEW_MODE_LABELS[mode]}
                  >
                    {VIEW_MODE_ICONS[mode]}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{VIEW_MODE_LABELS[mode]}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Sort dropdown - desktop only */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden gap-1 lg:flex">
                <span className="text-sm">
                  {currentSortOption?.labelKo ?? '정렬'}
                </span>
                <ChevronDown size={14} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => handleSortSelect(opt.value)}
                  className="flex items-center justify-between"
                >
                  <span>{opt.labelKo}</span>
                  {sortBy === opt.value && (
                    <span className="text-xs text-muted-foreground">
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="text-sm"
              >
                {sortOrder === 'desc' ? '오름차순으로 변경' : '내림차순으로 변경'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add clip button */}
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => openModal('addClip')}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">클립 추가</span>
            <span className="sm:hidden">추가</span>
          </Button>
        </div>
      </header>
  );
}
