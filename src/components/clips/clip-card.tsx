'use client';

import Image from 'next/image';
import { Heart, Archive, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ClipData } from '@/types/database';

interface ClipCardProps {
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

export function ClipCard({
  clip,
  isSelected = false,
  onSelect,
  onToggleFavorite,
  onArchive,
}: ClipCardProps) {
  const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();
  const gradient = getGradient(clip.id);

  function handleCardClick() {
    onSelect?.(clip.id);
  }

  function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    onToggleFavorite?.(clip.id);
  }

  function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    onArchive?.(clip.id);
  }

  function handleOpenLink(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(clip.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        'group relative cursor-pointer overflow-hidden p-0 gap-0 transition-shadow duration-200 hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {clip.image ? (
          <Image
            src={clip.image}
            alt={clip.title ?? ''}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center bg-gradient-to-br',
              gradient
            )}
          >
            <span className="text-3xl font-bold text-white">{firstLetter}</span>
          </div>
        )}

        {/* Hover action overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            onClick={handleFavorite}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40',
              clip.is_favorite && 'text-red-400'
            )}
            aria-label="즐겨찾기 토글"
          >
            <Heart className={cn('h-4 w-4', clip.is_favorite && 'fill-current')} />
          </button>
          <button
            onClick={handleArchive}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
            aria-label="보관함으로 이동"
          >
            <Archive className="h-4 w-4" />
          </button>
          <button
            onClick={handleOpenLink}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
            aria-label="링크 열기"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">
          {clip.title ?? clip.url}
        </p>
        {clip.summary && (
          <p className="line-clamp-2 text-xs text-muted-foreground leading-snug">
            {clip.summary}
          </p>
        )}

        {/* Bottom row */}
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {clip.platform && (
              <>
                <span
                  className={cn(
                    'inline-block h-2 w-2 flex-shrink-0 rounded-full',
                    PLATFORM_COLORS[clip.platform] ?? 'bg-gray-400'
                  )}
                />
                <span className="truncate text-xs text-muted-foreground">
                  {PLATFORM_LABELS[clip.platform] ?? clip.platform}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(clip.created_at)}
            </span>
            {clip.is_favorite && (
              <Heart className="h-3 w-3 fill-red-400 text-red-400" />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
