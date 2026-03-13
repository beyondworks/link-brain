'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Star, ExternalLink, Share2, Pin, Check, Loader2, AlertTriangle, RotateCcw, BookmarkPlus } from 'lucide-react';
import { shareClip } from '@/lib/utils/share';
import { useUIStore } from '@/stores/ui-store';
import { useTogglePin, useToggleReadLater } from '@/lib/hooks/use-clip-mutations';
import { useRetryClip } from '@/lib/hooks/use-retry-clip';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatRelativeTime } from '@/lib/utils';
import { PLATFORM_COLORS, PLATFORM_LABELS_EN, getGradient } from '@/config/constants';
import { isProxiableImageUrl } from '@/lib/utils/clip-content';
import { useLongPress } from '@/lib/hooks/use-long-press';
import type { ClipData } from '@/types/database';

interface ClipRowProps {
  clip: ClipData;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onSelect?: (id: string) => void;
  onToggleSelect?: () => void;
  onToggleFavorite?: (id: string) => void;
  onArchive?: (id: string) => void;
  onLongPress?: (clip: ClipData, position: { x: number; y: number }) => void;
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
  onLongPress,
  categoryName,
  categoryColor,
}: ClipRowProps) {
  const openClipPeek = useUIStore((s) => s.openClipPeek);
  const togglePin = useTogglePin();
  const toggleReadLater = useToggleReadLater();
  const retryClip = useRetryClip();
  const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();
  const gradient = getGradient(clip.id);

  const longPressHandlers = useLongPress({
    onLongPress: (e) => {
      if (!onLongPress) return;
      const touch = 'touches' in e ? e.touches[0] ?? e.changedTouches[0] : null;
      const pos = touch
        ? { x: touch.clientX, y: touch.clientY }
        : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
      onLongPress(clip, pos);
    },
    isEnabled: !!onLongPress,
  });

  function handleRowClick() {
    if (longPressHandlers.longPressFired.current) return;
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
      onTouchStart={longPressHandlers.onTouchStart}
      onTouchMove={longPressHandlers.onTouchMove}
      onTouchEnd={longPressHandlers.onTouchEnd}
      className={cn(
        'group flex cursor-pointer items-start gap-3 border-b border-border/30 py-3 last:border-b-0 transition-colors hover:bg-card/60',
        isSelected && 'border-primary/20 bg-primary/5'
      )}
    >
      {/* Thumbnail with checkbox overlay */}
      <div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-xl bg-muted shadow-sm">
        {/* Selection checkbox — overlay on thumbnail */}
        <div
          onClick={handleCheckboxClick}
          className={cn(
            'absolute left-1 top-1 z-10 transition-all',
            isSelectionMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <div className={cn(
            'flex h-5 w-5 items-center justify-center rounded border-2 cursor-pointer transition-spring shadow-sm',
            isSelected
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-background/80 backdrop-blur-sm hover:border-primary'
          )}>
            {isSelected && <Check className="h-3 w-3" />}
          </div>
        </div>
        {clip.image ? (
          <Image
            src={clip.image}
            alt={clip.title ?? ''}
            fill
            unoptimized={!isProxiableImageUrl(clip.image)}
            className="object-cover"
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
        {clip.processing_status && clip.processing_status !== 'ready' && !clip.title && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-[2px]">
            {(clip.processing_status === 'pending' || clip.processing_status === 'processing') && (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            )}
            {clip.processing_status === 'failed' && (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            )}
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
        {clip.processing_status === 'failed' && (
          <p className="mt-0.5 text-[11px] font-medium text-amber-500">추출 실패 — 재시도 가능</p>
        )}
        {(clip.processing_status === 'pending' || clip.processing_status === 'processing') && (
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground/60">분석 중...</p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          {clip.platform && (
            <div className="flex shrink-0 items-center gap-1">
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
            <div className="flex shrink-0 items-center gap-1">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: categoryColor ?? '#21DBA4' }}
              />
              <span className="text-[11px] font-medium text-muted-foreground">
                {categoryName}
              </span>
            </div>
          )}
          {clip.is_pinned && (
            <Pin className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" aria-label="고정됨" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); toggleReadLater.mutate({ clipId: clip.id, isReadLater: clip.is_read_later }); }}
            className={cn(
              'flex shrink-0 items-center rounded-full transition-spring',
              clip.is_read_later
                ? 'bg-gradient-brand px-1.5 py-0.5 text-white shadow-brand'
                : 'h-5 w-5 justify-center hover:bg-emerald-500/10'
            )}
            aria-label={clip.is_read_later ? '나중에 읽기 해제' : '나중에 읽기'}
          >
            {clip.is_read_later ? (
              <span className="text-[10px] font-bold">나중에</span>
            ) : (
              <BookmarkPlus size={12} className="text-muted-foreground/40 hover:text-emerald-500" />
            )}
          </button>
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground/50" suppressHydrationWarning>
            {formatRelativeTime(clip.created_at)}
          </span>
          <button
            onClick={handleFavorite}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-spring hover:bg-yellow-500/10 hover:scale-110"
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

      {/* Actions — visible on hover, hidden on mobile */}
      <div className="hidden flex-shrink-0 items-center gap-1 opacity-0 transition-spring group-hover:opacity-100 sm:flex">
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
              onClick={(e) => { e.stopPropagation(); toggleReadLater.mutate({ clipId: clip.id, isReadLater: clip.is_read_later }); }}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-spring hover:bg-emerald-500/10 hover:text-emerald-500 hover:scale-110',
                clip.is_read_later && 'text-emerald-500 opacity-100'
              )}
              aria-label={clip.is_read_later ? '나중에 읽기 해제' : '나중에 읽기'}
            >
              <BookmarkPlus className={cn('h-4 w-4', clip.is_read_later && 'fill-current')} />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>{clip.is_read_later ? '나중에 읽기 해제' : '나중에 읽기'}</p></TooltipContent>
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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); retryClip.mutate({ clipId: clip.id }); }}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-spring hover:bg-accent hover:text-foreground hover:scale-110"
              aria-label="재처리"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent><p>재처리</p></TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.clip.id === next.clip.id &&
  prev.clip.updated_at === next.clip.updated_at &&
  prev.clip.processing_status === next.clip.processing_status &&
  prev.isSelected === next.isSelected &&
  prev.isSelectionMode === next.isSelectionMode &&
  prev.categoryName === next.categoryName &&
  prev.categoryColor === next.categoryColor
);
