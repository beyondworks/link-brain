'use client';

import Image from 'next/image';
import { Heart, ExternalLink } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ClipData, ClipPlatform } from '@/types/database';

interface ClipRowProps {
  clip: ClipData;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onArchive?: (id: string) => void;
}

const PLATFORM_COLORS: Record<ClipPlatform, string> = {
  twitter: 'bg-sky-400',
  youtube: 'bg-red-500',
  instagram: 'bg-pink-500',
  tiktok: 'bg-black',
  linkedin: 'bg-blue-600',
  github: 'bg-gray-800',
  web: 'bg-gray-400',
  other: 'bg-gray-400',
};

const PLATFORM_LABELS: Record<ClipPlatform, string> = {
  twitter: 'Twitter',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  web: 'Web',
  other: '기타',
};

const GRADIENT_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
];

function getGradient(id: string): string {
  const index = id.charCodeAt(0) % GRADIENT_COLORS.length;
  return GRADIENT_COLORS[index];
}

export function ClipRow({
  clip,
  isSelected = false,
  onSelect,
  onToggleFavorite,
}: ClipRowProps) {
  const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();
  const gradient = getGradient(clip.id);

  function handleRowClick() {
    onSelect?.(clip.id);
  }

  function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    onToggleFavorite?.(clip.id);
  }

  function handleOpenLink(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(clip.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent',
        isSelected && 'bg-primary/5'
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
        {clip.thumbnail_url ? (
          <Image
            src={clip.thumbnail_url}
            alt={clip.title ?? ''}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center bg-gradient-to-br text-xs font-bold text-white',
              gradient
            )}
          >
            {firstLetter}
          </div>
        )}
      </div>

      {/* Title */}
      <p className="min-w-0 flex-1 truncate text-sm font-medium">
        {clip.title ?? clip.url}
      </p>

      {/* Platform badge */}
      <div className="hidden flex-shrink-0 items-center gap-1.5 sm:flex">
        <span
          className={cn(
            'inline-block h-2 w-2 rounded-full',
            PLATFORM_COLORS[clip.platform]
          )}
        />
        <span className="text-xs text-muted-foreground">
          {PLATFORM_LABELS[clip.platform]}
        </span>
      </div>

      {/* Time */}
      <span className="hidden flex-shrink-0 text-xs text-muted-foreground md:block">
        {formatRelativeTime(clip.created_at)}
      </span>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          onClick={handleFavorite}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:text-red-400 group-hover:opacity-100',
            clip.is_favorite && 'opacity-100 text-red-400'
          )}
          aria-label="즐겨찾기 토글"
        >
          <Heart className={cn('h-4 w-4', clip.is_favorite && 'fill-current')} />
        </button>
        <button
          onClick={handleOpenLink}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:text-foreground group-hover:opacity-100"
          aria-label="링크 열기"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
