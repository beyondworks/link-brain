'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Heart, Archive, ExternalLink, Share2, MessageSquare, Pin } from 'lucide-react';
import { shareClip } from '@/lib/utils/share';
import { useUIStore } from '@/stores/ui-store';
import { useTogglePin } from '@/lib/hooks/use-clip-mutations';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ClipData } from '@/types/database';

interface ClipCardProps {
  clip: ClipData;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onSelect?: (id: string) => void;
  onToggleSelect?: () => void;
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

export const ClipCard = memo(function ClipCard({
  clip,
  isSelected = false,
  isSelectionMode: _isSelectionMode,
  onSelect,
  onToggleSelect: _onToggleSelect,
  onToggleFavorite,
  onArchive,
}: ClipCardProps) {
  const openClipPeek = useUIStore((s) => s.openClipPeek);
  const togglePin = useTogglePin();
  const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();
  const gradient = getGradient(clip.id);

  function handleCardClick() {
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

  function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    onArchive?.(clip.id);
  }

  function handlePin(e: React.MouseEvent) {
    e.stopPropagation();
    togglePin.mutate({ clipId: clip.id, isPinned: clip.is_pinned ?? false });
  }

  function handleOpenLink(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(clip.url, '_blank', 'noopener,noreferrer');
  }

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    shareClip({ title: clip.title ?? clip.url, url: clip.url });
  }

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        'card-glow group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-0 gap-0 shadow-card',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {clip.image ? (
          <Image
            src={clip.image}
            alt={clip.title ?? ''}
            fill
            className="img-zoom object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center bg-gradient-to-br',
              gradient
            )}
          >
            <span className="text-4xl font-black text-white/90 drop-shadow-sm">{firstLetter}</span>
          </div>
        )}

        {/* Platform badge — top left */}
        {clip.platform && (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-glass px-2.5 py-1 backdrop-blur-md">
            <span
              className={cn(
                'inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full',
                PLATFORM_COLORS[clip.platform] ?? 'bg-gray-400'
              )}
            />
            <span className="text-[10px] font-semibold text-foreground/90">
              {PLATFORM_LABELS[clip.platform] ?? clip.platform}
            </span>
          </div>
        )}

        {/* Pin / Favorite indicators — top right */}
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
          {clip.is_pinned && (
            <Pin className="h-3.5 w-3.5 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgb(251,191,36)]" />
          )}
          {clip.is_favorite && (
            <Heart className="h-4 w-4 fill-red-400 text-red-400 drop-shadow-[0_0_6px_rgb(248,113,113)]" />
          )}
        </div>

        {/* Hover action overlay */}
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex items-center gap-2 pb-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleFavorite}
                  className={cn(
                    'animate-fade-in-up animation-delay-75 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-spring hover:bg-white/30 hover:scale-110',
                    clip.is_favorite && 'text-red-300'
                  )}
                  aria-label={clip.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                >
                  <Heart className={cn('h-4 w-4', clip.is_favorite && 'fill-current heart-pulse')} />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>{clip.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleArchive}
                  className="animate-fade-in-up animation-delay-150 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-spring hover:bg-white/30 hover:scale-110"
                  aria-label="아카이브"
                >
                  <Archive className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>아카이브</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleOpenLink}
                  className="animate-fade-in-up animation-delay-200 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-spring hover:bg-white/30 hover:scale-110"
                  aria-label="원본 열기"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>원본 열기</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handlePin}
                  className={cn(
                    'animate-fade-in-up animation-delay-300 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-spring hover:bg-white/30 hover:scale-110',
                    clip.is_pinned && 'text-amber-300'
                  )}
                  aria-label={clip.is_pinned ? '고정 해제' : '고정'}
                >
                  <Pin className={cn('h-4 w-4', clip.is_pinned && 'fill-current')} />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>{clip.is_pinned ? '고정 해제' : '고정'}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleShare}
                  className="animate-fade-in-up animation-delay-400 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-spring hover:bg-white/30 hover:scale-110"
                  aria-label="공유"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>공유</p></TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
          {clip.title ?? clip.url}
        </p>
        {clip.summary && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">
            {clip.summary}
          </p>
        )}

        {/* Bottom row */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <span className="text-[11px] font-medium text-muted-foreground/60">
            {formatRelativeTime(clip.created_at)}
          </span>
          <div className="flex items-center gap-1.5">
            {(clip as ClipData & { notes?: string | null }).notes && (
              <MessageSquare
                size={12}
                className="text-primary/60"
                aria-label="메모 있음"
              />
            )}
            {clip.is_read_later && (
              <span className="rounded-full bg-gradient-brand px-2.5 py-0.5 text-[10px] font-bold text-white shadow-brand">
                나중에
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}, (prev, next) =>
  prev.clip.id === next.clip.id &&
  prev.clip.updated_at === next.clip.updated_at &&
  prev.isSelected === next.isSelected &&
  prev.isSelectionMode === next.isSelectionMode
);
