'use client';

import { cn, formatRelativeTime } from '@/lib/utils';
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

export function ClipHeadline({
  clip,
  isSelected = false,
  onSelect,
}: ClipHeadlineProps) {
  function handleClick() {
    onSelect?.(clip.id);
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors hover:bg-accent',
        isSelected && 'bg-primary/5'
      )}
    >
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full',
          clip.platform ? (PLATFORM_COLORS[clip.platform] ?? 'bg-gray-400') : 'bg-gray-400'
        )}
      />
      <p className="min-w-0 flex-1 truncate text-sm">
        {clip.title ?? clip.url}
      </p>
      <span className="flex-shrink-0 text-xs text-muted-foreground">
        {formatRelativeTime(clip.created_at)}
      </span>
    </div>
  );
}
