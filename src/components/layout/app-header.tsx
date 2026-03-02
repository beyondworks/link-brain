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
import { AdvancedFilters } from '@/components/layout/advanced-filters';
import { NotificationCenter } from '@/components/layout/notification-center';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { SORT_OPTIONS, VIEW_MODES } from '@/config/constants';
import type { ViewMode } from '@/config/constants';
import type { ClipSortBy } from '@/types/clip';

interface AppHeaderProps {
  title?: string;
  titleKo?: string;
}

const VIEW_MODE_ICONS: Record<ViewMode, React.ReactNode> = {
  grid: <Grid3X3 size={15} />,
  list: <List size={15} />,
  headlines: <Newspaper size={15} />,
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
    <header className="animate-fade-in-down flex h-16 items-center gap-3 border-b border-border/50 bg-glass px-5">
      {/* Title (desktop) */}
      {(title || titleKo) && (
        <h1 className="mr-1 hidden text-sm font-semibold text-foreground lg:block">
          {titleKo ?? title}
        </h1>
      )}

      {/* Search trigger */}
      <Button
        variant="ghost"
        className="group hidden h-9 flex-1 max-w-md justify-start gap-2.5 rounded-xl border border-border/40 bg-muted/30 px-3.5 text-muted-foreground transition-spring hover:border-primary/30 hover:bg-muted/50 hover:glow-brand-sm lg:flex"
        onClick={() => setOmniSearchOpen(true)}
      >
        <Search size={14} className="flex-shrink-0 transition-spring group-hover:text-primary" />
        <span className="text-sm">검색...</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/70 lg:flex">
          ⌘K
        </kbd>
      </Button>

      <div className="ml-auto flex items-center gap-2.5">
        {/* View mode toggles - desktop only */}
        <div className="hidden items-center rounded-xl border border-border/50 bg-muted/30 p-0.5 lg:flex">
          {VIEW_MODES.map((mode) => (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-lg transition-spring',
                    viewMode === mode
                      ? 'bg-gradient-brand text-white shadow-brand'
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
            <Button
              variant="ghost"
              size="sm"
              className="hidden gap-1.5 rounded-lg text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground lg:flex"
            >
              <span>{currentSortOption?.labelKo ?? '정렬'}</span>
              <ChevronDown size={13} />
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
                  <span className="text-xs font-medium text-primary">
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

        {/* Advanced filters */}
        <AdvancedFilters />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notification center */}
        <NotificationCenter />

        {/* Add clip button */}
        <Button
          size="sm"
          className="animate-pulse-brand gap-1.5 rounded-xl bg-gradient-brand text-white shadow-brand transition-spring hover:glow-brand hover:shadow-brand-lg hover-scale"
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
