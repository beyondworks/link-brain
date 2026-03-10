'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MarkdownContent } from '@/components/clips/markdown-content';
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
  ChevronDown,
  ChevronUp,
  FileText,
  MessageSquare,
  RotateCcw,
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
import { useSwipeDismiss } from '@/lib/hooks/use-swipe-dismiss';
import type { ClipPeekMode } from '@/stores/ui-store';
import { useClip } from '@/lib/hooks/use-clips';
import { useCategories } from '@/lib/hooks/use-categories';
import { useToggleFavorite, useToggleArchive } from '@/lib/hooks/use-clip-mutations';
import { useRetryClip } from '@/lib/hooks/use-retry-clip';
import { getSeedClip } from '@/config/seed-clips';
import { cn, formatRelativeTime } from '@/lib/utils';
import { PLATFORM_LABELS, PLATFORM_COLORS, PLATFORM_ICONS } from '@/config/constants';
import { extractYouTubeVideoId, extractImagesFromContent, splitContentSections, cleanDisplayContent, isProxiableImageUrl } from '@/lib/utils/clip-content';
import { ClipCategorySelector } from '@/components/clips/clip-category-selector';
import { ClipCollectionAssigner } from '@/components/clips/clip-collection-assigner';
import type { ClipData, ClipContent } from '@/types/database';


const MODE_OPTIONS: { mode: ClipPeekMode; icon: React.ElementType; label: string }[] = [
  { mode: 'side', icon: PanelRight, label: '사이드' },
  { mode: 'center', icon: Square, label: '중앙' },
  { mode: 'full', icon: Maximize2, label: '전체화면' },
];

/* ─── Image slideshow ─────────────────────────────────────────── */
function ImageSlideshow({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);
  const [errored, setErrored] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const validImages = images.filter((_, i) => !errored.has(i));
  if (validImages.length === 0) return null;

  const displayIdx = Math.min(current, validImages.length - 1);
  const actualSrc = validImages[displayIdx];

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-border/60 shadow-card transition-opacity duration-300",
      loaded ? "opacity-100" : "opacity-0"
    )}>
      <div className="relative w-full" style={{ aspectRatio: '16/10' }}>
        <Image
          key={actualSrc}
          src={actualSrc}
          alt={`이미지 ${displayIdx + 1}/${validImages.length}`}
          fill
          unoptimized={!isProxiableImageUrl(actualSrc)}
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 560px) 100vw, 560px"
          onLoad={() => setLoaded(true)}
          onError={() => {
            const originalIdx = images.indexOf(actualSrc);
            if (originalIdx >= 0) setErrored((prev) => new Set(prev).add(originalIdx));
          }}
        />
      </div>
      {validImages.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((p) => (p - 1 + validImages.length) % validImages.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-spring hover:bg-black/70"
            aria-label="이전 이미지"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrent((p) => (p + 1) % validImages.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-spring hover:bg-black/70"
            aria-label="다음 이미지"
          >
            ›
          </button>
          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {validImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-all',
                  i === displayIdx ? 'w-4 bg-white' : 'bg-white/50 hover:bg-white/70'
                )}
                aria-label={`이미지 ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Peek content (shared across all modes) ──────────────────── */
function PeekContent({
  clip,
  clipContents,
  isSeed,
  onClose,
  categoryName,
  categoryColor,
}: {
  clip: ClipData;
  clipContents?: ClipContent[];
  isSeed: boolean;
  onClose: () => void;
  categoryName?: string;
  categoryColor?: string | null;
}) {
  const toggleFavorite = useToggleFavorite();
  const archiveClip = useToggleArchive();
  const retryClip = useRetryClip();
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
    <div className="flex min-h-0 flex-1 flex-col">
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg transition-spring hover:bg-muted"
                onClick={() => retryClip.mutate({ clipId: clip.id })}
                aria-label="재처리"
              >
                <RotateCcw size={15} className="text-muted-foreground" />
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
          {/* Platform + Category badge */}
          {(platformLabel || categoryName || !isSeed) && (
            <div className="mb-3 flex items-center gap-2">
              {platformLabel && (
                <>
                  <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]', platformColor)}>
                    {platformIcon}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">{platformLabel}</span>
                </>
              )}
              {clip.author_handle && (
                <span className="text-xs text-muted-foreground/60">· {clip.author_handle}</span>
              )}
              {!isSeed && (
                <>
                  {platformLabel && <span className="text-xs text-muted-foreground/40">·</span>}
                  <ClipCategorySelector clipId={clip.id} currentCategoryId={clip.category_id ?? null} />
                  <ClipCollectionAssigner clipId={clip.id} />
                </>
              )}
              {isSeed && categoryName && (
                <>
                  {platformLabel && <span className="text-xs text-muted-foreground/40">·</span>}
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: categoryColor ?? '#21DBA4' }}
                  />
                  <span className="text-xs font-semibold text-muted-foreground">{categoryName}</span>
                </>
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

          {/* YouTube embed or Image slideshow */}
          {(() => {
            if (platform === 'youtube') {
              const videoId = extractYouTubeVideoId(clip.url);
              if (videoId) {
                return (
                  <div className="mt-5 overflow-hidden rounded-xl border border-border/60 shadow-card">
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title={clip.title ?? 'YouTube video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 h-full w-full"
                      />
                    </div>
                  </div>
                );
              }
            }
            const allImages = extractImagesFromContent(clipContents, clip.image);
            return allImages.length > 0 ? (
              <div className="mt-5">
                <ImageSlideshow images={allImages} />
              </div>
            ) : null;
          })()}

          {/* AI Summary */}
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

          {/* Body content from clip_contents */}
          <PeekBodyContent clipContents={clipContents} platform={clip.platform ?? undefined} />

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


/* ─── Collapsible section ──────────────────────────────────────── */
function CollapsibleSection({
  icon: Icon,
  title,
  content,
  isMarkdown,
  maxHeight = 300,
}: {
  icon: React.ElementType;
  title: string;
  content: string;
  isMarkdown: boolean;
  maxHeight?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className="text-muted-foreground" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </h3>
        </div>
        <div className="h-px flex-1 bg-border/50" />
      </div>
      <div
        className="relative overflow-hidden rounded-xl border border-border/60 bg-glass p-5 transition-all duration-300"
        style={!expanded ? { maxHeight } : undefined}
      >
        {isMarkdown ? (
          <MarkdownContent content={content} />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
            {content}
          </p>
        )}
        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/95 to-transparent" />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-muted-foreground transition-spring hover:text-foreground hover:bg-muted/30"
      >
        {expanded ? (
          <>
            <ChevronUp size={13} />
            접기
          </>
        ) : (
          <>
            <ChevronDown size={13} />
            더 보기
          </>
        )}
      </button>
    </div>
  );
}

/* ─── Body content (collapsible, with body/comments split) ─────── */
function PeekBodyContent({
  clipContents,
  platform,
}: {
  clipContents?: ClipContent[];
  platform?: string;
}) {
  const first = clipContents?.[0];
  const text = first?.content_markdown ?? first?.raw_markdown;

  if (!text && !first?.html_content) return null;

  const rawContent = text
    ? text
    : (first?.html_content ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  if (!rawContent) return null;

  const displayContent = cleanDisplayContent(rawContent);
  if (!displayContent) return null;

  const { body, subContent } = splitContentSections(displayContent);
  const isThreads = platform === 'threads';

  return (
    <div className="mt-5 space-y-5">
      <CollapsibleSection
        icon={FileText}
        title={isThreads ? '메인 스레드' : 'Content'}
        content={body}
        isMarkdown
        maxHeight={300}
      />
      {isThreads && subContent && (
        <CollapsibleSection
          icon={MessageSquare}
          title="서브 스레드"
          content={subContent}
          isMarkdown
          maxHeight={200}
        />
      )}
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
  const rawCC = !isSeed && apiClip ? (apiClip as ClipData & { clip_contents?: ClipContent[] | ClipContent }).clip_contents : undefined;
  const clipContents = rawCC ? (Array.isArray(rawCC) ? rawCC : [rawCC]) : undefined;

  const { data: categories = [] } = useCategories();
  const category = clip?.category_id
    ? categories.find((c) => c.id === clip.category_id)
    : undefined;

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

  const swipeHandlers = useSwipeDismiss({
    direction: 'right',
    onDismiss: closeClipPeek,
    isEnabled: clipPeekMode === 'side' && isOpen,
  });

  if (!isOpen) return null;

  const content =
    !clip && isLoading ? (
      <PeekSkeleton />
    ) : clip ? (
      <PeekContent clip={clip} clipContents={clipContents} isSeed={isSeed} onClose={closeClipPeek} categoryName={category?.name} categoryColor={category?.color} />
    ) : null;

  /* ─── Side mode: Sheet from right ────────────────────────── */

  if (clipPeekMode === 'side') {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && closeClipPeek()}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full border-l border-border/50 bg-background p-0 sm:max-w-[560px]"
          onTouchStart={swipeHandlers.onTouchStart}
          onTouchEnd={swipeHandlers.onTouchEnd}
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
          className="flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border-border/60 bg-background p-0 shadow-elevated sm:max-w-3xl"
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
