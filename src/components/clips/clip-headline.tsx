'use client';

import { memo } from 'react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import type { ClipData } from '@/types/database';

interface ClipHeadlineProps {
  clip: ClipData;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onArchive?: (id: string) => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  twitter: 'bg-sky-400',
  youtube: 'bg-red-500',
  instagram: 'bg-pink-500',
  tiktok: 'bg-black',
  linkedin: 'bg-blue-600',
  github: 'bg-gray-800',
  medium: 'bg-gray-700',
  substack: 'bg-orange-500',
  reddit: 'bg-orange-600',
  web: 'bg-gray-400',
  other: 'bg-gray-400',
};

export const ClipHeadline = memo(function ClipHeadline({
  clip,
  isSelected = false,
  onSelect,
}: ClipHeadlineProps) {
  const openClipPeek = useUIStore((s) => s.openClipPeek);

  function handleClick() {
    if (onSelect) {
      onSelect(clip.id);
    } else {
      openClipPeek(clip.id);
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-smooth hover:bg-muted/50',
        isSelected && 'bg-primary/5 hover:bg-primary/8'
      )}
    >
      <span
        className={cn(
          'inline-block h-2 w-2 flex-shrink-0 rounded-full',
          clip.platform ? (PLATFORM_COLORS[clip.platform] ?? 'bg-gray-400') : 'bg-gray-400'
        )}
      />
      <p className="min-w-0 flex-1 truncate text-sm text-foreground">
        {clip.title ?? clip.url}
      </p>
      <span className="flex-shrink-0 text-[11px] text-muted-foreground tabular-nums" suppressHydrationWarning>
        {formatRelativeTime(clip.created_at)}
      </span>
    </div>
  );
}, (prev, next) =>
  prev.clip.id === next.clip.id &&
  prev.clip.updated_at === next.clip.updated_at &&
  prev.isSelected === next.isSelected
);
