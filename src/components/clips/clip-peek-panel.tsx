'use client';

import { useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Star,
  Archive,
  ExternalLink,
  X,
  PanelRight,
  Square,
  Maximize2,
  Clock,
  Calendar,
  Sparkles,
  Eye,
  ThumbsUp,
  ArrowUpRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUIStore } from '@/stores/ui-store';
import type { ClipPeekMode } from '@/stores/ui-store';
import { useClip } from '@/lib/hooks/use-clips';
import { useToggleFavorite } from '@/hooks/mutations/use-toggle-favorite';
import { useArchiveClip } from '@/hooks/mutations/use-archive-clip';
import { getSeedClip } from '@/config/seed-clips';
import { cn, formatRelativeTime } from '@/lib/utils';
import { PLATFORM_LABELS } from '@/config/constants';
import type { ClipData } from '@/types/database';

/* ─── Platform colors ─────────────────────────────────────────── */
const PLATFORM_COLORS: Record<string, string> = {
  web: 'bg-gray-500',
  youtube: 'bg-red-500',
  github: 'bg-gray-800',
  twitter: 'bg-sky-500',
  medium: 'bg-gray-700',
  reddit: 'bg-orange-600',
  substack: 'bg-orange-500',
  linkedin: 'bg-blue-600',
  instagram: 'bg-pink-500',
  tiktok: 'bg-black',
  threads: 'bg-gray-900',
  naver: 'bg-green-500',
  pinterest: 'bg-red-600',
};

const PLATFORM_ICONS: Record<string, string> = {
  web: '🌐',
  youtube: '▶️',
  github: '🐙',
  twitter: '𝕏',
  medium: '✍️',
  reddit: '🔥',
  substack: '📰',
  linkedin: '💼',
  instagram: '📸',
  tiktok: '🎵',
  threads: '🧵',
  naver: '📗',
  pinterest: '📌',
};

const MODE_OPTIONS: { mode: ClipPeekMode; icon: React.ElementType; label: string }[] = [
  { mode: 'side', icon: PanelRight, label: '사이드' },
  { mode: 'center', icon: Square, label: '중앙' },
  { mode: 'full', icon: Maximize2, label: '전체화면' },
];

/* ─── Peek content (shared across all modes) ──────────────────── */
function PeekContent({
  clip,
  isSeed,
  onClose,
}: {
  clip: ClipData;
  isSeed: boolean;
  onClose: () => void;
}) {
  const toggleFavorite = useToggleFavorite();
  const archiveClip = useArchiveClip();
  const clipPeekMode = useUIStore((s) => s.clipPeekMode);
  const setClipPeekMode = useUIStore((s) => s.setClipPeekMode);

  const platform = clip.platform ?? 'web';
  const platformLabel =
    clip.platform
      ? (PLATFORM_LABELS[clip.platform as keyof typeof PLATFORM_LABELS]?.ko ?? clip.platform)
      : null;
  const platformColor = PLATFORM_COLORS[platform] ?? 'bg-gray-500';
  const platformIcon = PLATFORM_ICONS[platform] ?? '🌐';

  return (
    <div className="flex h-full flex-col">
      {/* Header toolbar */}
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
        {/* Mode switcher */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-muted/30 p-0.5">
          {MODE_OPTIONS.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setClipPeekMode(mode)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-spring',
                clipPeekMode === mode
                  ? 'bg-gradient-brand text-white shadow-brand'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              aria-label={label}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!isSeed && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg transition-spring hover:bg-yellow-500/10"
                onClick={() =>
                  toggleFavorite.mutate({
                    clipId: clip.id,
                    isFavorite: !clip.is_favorite,
                  })
                }
                aria-label={clip.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              >
                <Star
                  size={15}
                  className={
                    clip.is_favorite
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg transition-spring hover:bg-muted"
                onClick={() =>
                  archiveClip.mutate({
                    clipId: clip.id,
                    isArchived: !clip.is_archived,
                  })
                }
                aria-label={clip.is_archived ? '아카이브 해제' : '아카이브'}
              >
                <Archive
                  size={15}
                  className={clip.is_archived ? 'text-primary' : 'text-muted-foreground'}
                />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg transition-spring hover:bg-muted"
            asChild
          >
            <a href={clip.url} target="_blank" rel="noopener noreferrer" aria-label="원본 열기">
              <ExternalLink size={15} className="text-muted-foreground" />
            </a>
          </Button>
          <div className="mx-1 h-5 w-px bg-border/50" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg transition-spring hover:bg-muted"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={15} className="text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className={cn(
          'px-6 py-6',
          clipPeekMode === 'full' && 'mx-auto max-w-3xl'
        )}>
          {/* Platform badge */}
          {platformLabel && (
            <div className="mb-3 flex items-center gap-2">
              <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]', platformColor)}>
                {platformIcon}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{platformLabel}</span>
              {clip.author_handle && (
                <span className="text-xs text-muted-foreground/60">· {clip.author_handle}</span>
              )}
            </div>
          )}

          {/* Title */}
          <h2 className="text-xl font-bold leading-snug tracking-tight text-foreground">
            {clip.title ?? '제목 없음'}
          </h2>

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {clip.author && (
              <span className="rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                {clip.author}
              </span>
            )}
            {clip.read_time != null && (
              <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                <Clock size={11} />
                {clip.read_time}분 읽기
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              <Calendar size={11} />
              {formatRelativeTime(clip.created_at)}
            </span>
          </div>

          {/* Stats */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {clip.ai_score != null && (
              <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 px-3 py-1.5">
                <Sparkles size={13} className="text-primary" />
                <span className="text-xs font-semibold text-primary">AI 점수 {clip.ai_score}</span>
              </div>
            )}
            {clip.views > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5">
                <Eye size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{clip.views.toLocaleString()} 조회</span>
              </div>
            )}
            {clip.likes_count > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5">
                <ThumbsUp size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{clip.likes_count.toLocaleString()} 좋아요</span>
              </div>
            )}
          </div>

          {/* OG Image */}
          {clip.image && (
            <div className="mt-5 overflow-hidden rounded-xl border border-border/60 shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={clip.image} alt={clip.title ?? ''} className="w-full object-cover" />
            </div>
          )}

          {/* Summary */}
          {clip.summary && (
            <div className="mt-5 rounded-xl border border-border/60 bg-glass p-5">
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-gradient-brand text-[11px] font-bold uppercase tracking-[0.14em]">
                  AI 요약
                </h3>
                <div className="divider-gradient flex-1" />
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{clip.summary}</p>
            </div>
          )}

          {/* Full detail link */}
          <div className="mt-5 flex items-center gap-3">
            <Link
              href={`/clip/${clip.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-spring hover:border-primary/40 hover:glow-brand-sm hover-lift"
            >
              <Eye size={14} className="text-primary" />
              상세 보기
            </Link>
            <a
              href={clip.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-spring hover:border-primary/40 hover:glow-brand-sm hover-lift"
            >
              <ArrowUpRight size={14} className="text-primary" />
              원본 페이지
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Loading skeleton ────────────────────────────────────────── */
function PeekSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="mb-4 h-4 w-20" />
      <Skeleton className="mb-2 h-7 w-3/4" />
      <Skeleton className="mb-6 h-4 w-1/2" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

/* ─── Main ClipPeekPanel ──────────────────────────────────────── */
export function ClipPeekPanel() {
  const peekClipId = useUIStore((s) => s.peekClipId);
  const clipPeekMode = useUIStore((s) => s.clipPeekMode);
  const closeClipPeek = useUIStore((s) => s.closeClipPeek);

  const isOpen = peekClipId !== null;
  const isSeed = peekClipId?.startsWith('seed-') ?? false;
  const seedClip = isSeed && peekClipId ? getSeedClip(peekClipId) : undefined;

  const { data: apiClip, isLoading } = useClip(
    isSeed || !peekClipId ? '' : peekClipId
  );

  const clip = seedClip ?? apiClip;

  // ESC closes peek — only needed for full mode (Sheet/Dialog handle their own ESC)
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && clipPeekMode === 'full') closeClipPeek();
    },
    [isOpen, clipPeekMode, closeClipPeek]
  );

  useEffect(() => {
    if (clipPeekMode !== 'full') return;
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [handleEsc, clipPeekMode]);

  if (!isOpen) return null;

  const content =
    !clip && isLoading ? (
      <PeekSkeleton />
    ) : clip ? (
      <PeekContent clip={clip} isSeed={isSeed} onClose={closeClipPeek} />
    ) : null;

  /* ─── Side mode: Sheet from right ────────────────────────── */
  if (clipPeekMode === 'side') {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && closeClipPeek()}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full border-l border-border/50 bg-background p-0 sm:max-w-[560px]"
        >
          <SheetTitle className="sr-only">클립 미리보기</SheetTitle>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  /* ─── Center mode: Dialog ────────────────────────────────── */
  if (clipPeekMode === 'center') {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeClipPeek()}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          className="max-h-[85vh] overflow-hidden rounded-2xl border-border/60 bg-background p-0 shadow-elevated sm:max-w-3xl"
        >
          <DialogTitle className="sr-only">클립 미리보기</DialogTitle>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  /* ─── Full mode: Full overlay ────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in">
      {content}
    </div>
  );
}
