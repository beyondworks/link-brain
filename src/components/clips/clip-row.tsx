'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Star, ExternalLink, Share2, Pin, Check } from 'lucide-react';
import { shareClip } from '@/lib/utils/share';
import { useUIStore } from '@/stores/ui-store';
import { useTogglePin } from '@/lib/hooks/use-clip-mutations';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatRelativeTime } from '@/lib/utils';
import { PLATFORM_COLORS, PLATFORM_LABELS_EN, getGradient } from '@/config/constants';
import type { ClipData } from '@/types/database';

interface ClipRowProps {
  clip: ClipData;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onSelect?: (id: string) => void;
  onToggleSelect?: () => void;
  onToggleFavorite?: (id: string) => void;
  onArchive?: (id: string) => void;
  categoryName?: string;
  categoryColor?: string | null;
}


export const ClipRow = memo(function ClipRow({
  clip,
  isSelected = false,
  isSelectionMode = false,
  onSelect,
  onToggleSelect,
  onToggleFavorite,
  categoryName,
  categoryColor,
}: ClipRowProps) {
  const openClipPeek = useUIStore((s) => s.openClipPeek);
  const togglePin = useTogglePin();
  const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();
  const gradient = getGradient(clip.id);

  function handleRowClick() {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect();
      return;
    }
    if (onSelect) {
      onSelect(clip.id);
    } else {
      openClipPeek(clip.id);
    }
  }

  function handleCheckboxClick(e: React.MouseEvent) {
    e.stopPropagation();
    onToggleSelect?.();
  }

  function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    onToggleFavorite?.(clip.id);
  }

  function handleOpenLink(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(clip.url, '_blank', 'noopener,noreferrer');
  }

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    shareClip({ title: clip.title ?? clip.url, url: clip.url });
  }

  function handlePin(e: React.MouseEvent) {
    e.stopPropagation();
    togglePin.mutate({ clipId: clip.id, isPinned: clip.is_pinned ?? false });
  }

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        'card-interactive group flex cursor-pointer items-center gap-4 rounded-2xl border border-transparent px-4 py-3 transition-spring hover:border-border/50 hover:bg-card hover:shadow-card',
        isSelected && 'border-primary/20 bg-primary/5'
      )}
    >
      {/* Selection checkbox */}
      <div
        onClick={handleCheckboxClick}
        className={cn(
          'flex-shrink-0 transition-opacity',
          isSelectionMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <div className={cn(
          'flex h-5 w-5 items-center justify-center rounded border-2 cursor-pointer transition-spring',
          isSelected
            ? 'border-primary bg-primary text-white'
            : 'border-border bg-muted hover:border-primary'
        )}>
          {isSelected && <Check className="h-3 w-3" />}
        </div>
      </div>

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
                {PLATFORM_LABELS_EN[clip.platform] ?? clip.platform}
              </span>
            </div>
          )}
          {categoryName && (
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: categoryColor ?? '#21DBA4' }}
              />
              <span className="text-[11px] font-medium text-muted-foreground">
                {categoryName}
              </span>
            </div>
          )}
          <span className="text-[11px] text-muted-foreground/50">
            {formatRelativeTime(clip.created_at)}
          </span>
          {clip.is_pinned && (
            <Pin className="h-3 w-3 fill-amber-400 text-amber-400" aria-label="고정됨" />
          )}
          {clip.is_read_later && (
            <span className="rounded-full bg-gradient-brand px-2 py-0.5 text-[10px] font-bold text-white shadow-brand">
              나중에
            </span>
          )}
          <button
            onClick={handleFavorite}
            className="flex h-5 w-5 items-center justify-center rounded-full transition-spring hover:bg-yellow-500/10 hover:scale-110"
            aria-label={clip.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
          >
            <Star
              size={12}
              className={cn(
                'transition-spring',
                clip.is_favorite
                  ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_4px_rgb(250,204,21)]'
                  : 'text-muted-foreground/40 hover:text-yellow-400'
              )}
            />
          </button>
        </div>
      </div>

      {/* Actions — visible on hover */}
      <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-spring group-hover:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleFavorite}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-spring hover:bg-yellow-500/10 hover:text-yellow-400 hover:scale-110',
                clip.is_favorite && 'text-yellow-400 opacity-100'
              )}
              aria-label={clip.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
            >
              <Star
                className={cn(
                  'h-4 w-4 transition-spring',
                  clip.is_favorite && 'fill-current drop-shadow-[0_0_6px_rgb(250,204,21)]'
                )}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>{clip.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleOpenLink}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-spring hover:bg-accent hover:text-foreground hover:scale-110"
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
                'flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-spring hover:bg-amber-500/10 hover:text-amber-400 hover:scale-110',
                clip.is_pinned && 'text-amber-400 opacity-100'
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
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-spring hover:bg-accent hover:text-foreground hover:scale-110"
              aria-label="공유"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>공유</p></TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.clip.id === next.clip.id &&
  prev.clip.updated_at === next.clip.updated_at &&
  prev.isSelected === next.isSelected &&
  prev.isSelectionMode === next.isSelectionMode &&
  prev.categoryName === next.categoryName &&
  prev.categoryColor === next.categoryColor
);
