'use client';

import Image from 'next/image';
import { Heart, ExternalLink } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ClipData } from '@/types/database';

interface ClipRowProps {
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

export function ClipRow({
  clip,
  isSelected = false,
  onSelect,
  onToggleFavorite,
}: ClipRowProps) {
  const openClipPeek = useUIStore((s) => s.openClipPeek);
  const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();
  const gradient = getGradient(clip.id);

  function handleRowClick() {
    if (onSelect) {
      onSelect(clip.id);
    } else {
      openClipPeek(clip.id);
    }
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
        'card-interactive group flex cursor-pointer items-center gap-4 rounded-2xl border border-transparent px-4 py-3 transition-spring hover:border-border/50 hover:bg-card hover:shadow-card',
        isSelected && 'border-primary/20 bg-primary/5'
      )}
    >
      {/* Thumbnail — larger */}
      <div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-xl bg-muted shadow-sm">
        {clip.image ? (
          <Image
            src={clip.image}
            alt={clip.title ?? ''}
            fill
            className="img-zoom object-cover"
            sizes="72px"
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center bg-gradient-to-br text-lg font-black text-white',
              gradient
            )}
          >
            {firstLetter}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-snug text-foreground transition-spring group-hover:text-primary">
          {clip.title ?? clip.url}
        </p>
        {clip.summary && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/70">
            {clip.summary}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2.5">
          {clip.platform && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-block h-1.5 w-1.5 rounded-full',
                  PLATFORM_COLORS[clip.platform] ?? 'bg-gray-400'
                )}
              />
              <span className="text-[11px] font-medium text-muted-foreground">
                {PLATFORM_LABELS[clip.platform] ?? clip.platform}
              </span>
            </div>
          )}
          <span className="text-[11px] text-muted-foreground/50">
            {formatRelativeTime(clip.created_at)}
          </span>
          {clip.is_read_later && (
            <span className="rounded-full bg-gradient-brand px-2 py-0.5 text-[10px] font-bold text-white shadow-brand">
              나중에
            </span>
          )}
        </div>
      </div>

      {/* Actions — visible on hover */}
      <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-spring group-hover:opacity-100">
        <button
          onClick={handleFavorite}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-spring hover:bg-red-500/10 hover:text-red-400 hover:scale-110',
            clip.is_favorite && 'text-red-400 opacity-100'
          )}
          aria-label="즐겨찾기 토글"
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-spring',
              clip.is_favorite && 'fill-current heart-pulse drop-shadow-[0_0_6px_rgb(248,113,113)]'
            )}
          />
        </button>
        <button
          onClick={handleOpenLink}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-spring hover:bg-accent hover:text-foreground hover:scale-110"
          aria-label="링크 열기"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
