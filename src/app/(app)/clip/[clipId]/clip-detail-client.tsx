'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useClip } from '@/lib/hooks/use-clips';
import { useToggleFavorite, useToggleArchive } from '@/lib/hooks/use-clip-mutations';
import { useReadingProgress } from '@/lib/hooks/use-reading-progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Star,
  Archive,
  ExternalLink,
  Share2,
  ArrowLeft,
  Clock,
  Calendar,
  Eye,
  ThumbsUp,
  Sparkles,
  GitFork,
  MessageSquare,
  Repeat2,
  ArrowUpRight,
  BookOpen,
  Hash,
  Link2,
  Link2Off,
  Copy,
  Check,
  Highlighter,
  Bell,
  ChevronDown,
  ChevronUp,
  History,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { shareClip } from '@/lib/utils/share';
import { ClipTagEditor } from '@/components/clips/clip-tag-editor';
import { ClipCollectionAssigner } from '@/components/clips/clip-collection-assigner';
import { ClipCategorySelector } from '@/components/clips/clip-category-selector';
import { ClipNotes } from '@/components/clips/clip-notes';
import { TextHighlighter } from '@/components/clips/text-highlighter';
import { ReminderDialog } from '@/components/clips/reminder-dialog';
import { ClipActivityTimeline } from '@/components/clips/clip-activity-timeline';
import { RelatedClips } from '@/components/clips/related-clips';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useHighlights, useCreateHighlight, useDeleteHighlight } from '@/lib/hooks/use-highlights';
import { useCategories } from '@/lib/hooks/use-categories';
import { PLATFORM_LABELS, PLATFORM_COLORS, PLATFORM_ICONS } from '@/config/constants';
import { getSeedClip, SEED_CONTENT } from '@/config/seed-clips';
import { estimateReadingTime } from '@/lib/utils/reading-time';
import { extractYouTubeVideoId, extractImagesFromContent, splitContentSections, cleanDisplayContent, isProxiableImageUrl } from '@/lib/utils/clip-content';
import { MarkdownContent } from '@/components/clips/markdown-content';
import type { ClipData, ClipContent } from '@/types/database';

interface Props {
  clipId: string;
}


/* ─── Platform-specific hero sections ────────────────────────────────── */
function PlatformHero({ clip }: { clip: ClipData }) {
  const platform = clip.platform ?? 'web';

  switch (platform) {
    case 'youtube': {
      const videoId = extractYouTubeVideoId(clip.url);
      return (
        <div className="mb-7 animate-fade-in-up">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-gray-950 shadow-card">
            {videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title={clip.title ?? 'YouTube video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-red-600/20 to-red-900/40">
                <p className="mt-4 text-sm font-medium text-white/70">YouTube 동영상</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'github':
      return (
        <div className="mb-7 animate-fade-in-up rounded-2xl border border-border/60 bg-gray-950 p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <span className="text-xl">🐙</span>
            </div>
            <div>
              <p className="text-sm text-white/50">{clip.author}</p>
              <p className="text-lg font-bold text-white">{clip.title?.split(' — ')[0]}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{clip.summary?.split('.')[0]}.</p>
          <div className="mt-4 flex items-center gap-5 border-t border-white/10 pt-4">
            <span className="flex items-center gap-1.5 text-sm text-yellow-400">
              <Star size={14} fill="currentColor" /> 12.4k
            </span>
            <span className="flex items-center gap-1.5 text-sm text-white/50">
              <GitFork size={14} /> 1.8k
            </span>
            <span className="flex items-center gap-1.5 text-sm text-white/50">
              <Eye size={14} /> {clip.views?.toLocaleString()}
            </span>
            <span className="ml-auto rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400">
              TypeScript
            </span>
          </div>
        </div>
      );

    case 'twitter':
      return (
        <div className="mb-7 animate-fade-in-up rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-lg font-bold text-white">
              {clip.author?.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-foreground">{clip.author}</p>
                <p className="text-sm text-muted-foreground">{clip.author_handle}</p>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">{clip.summary}</p>
              <div className="mt-4 flex items-center gap-6 text-muted-foreground">
                <span className="flex items-center gap-1.5 text-sm hover:text-sky-500">
                  <MessageSquare size={15} /> 342
                </span>
                <span className="flex items-center gap-1.5 text-sm hover:text-green-500">
                  <Repeat2 size={15} /> 890
                </span>
                <span className="flex items-center gap-1.5 text-sm hover:text-red-500">
                  <Star size={15} /> {clip.likes_count?.toLocaleString()}
                </span>
                <span className="flex items-center gap-1.5 text-sm hover:text-sky-500">
                  <Eye size={15} /> {clip.views?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'reddit':
      return (
        <div className="mb-7 animate-fade-in-up rounded-2xl border border-orange-500/20 bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-full bg-orange-600 px-2 py-0.5 text-xs font-bold text-white">{clip.author}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{formatRelativeTime(clip.created_at)}</span>
          </div>
          <p className="mt-2 text-lg font-bold text-foreground">{clip.title}</p>
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-orange-500">
              <ThumbsUp size={14} /> {clip.likes_count?.toLocaleString()} upvotes
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={14} /> 187 comments
            </span>
          </div>
        </div>
      );

    default:
      return null;
  }
}

/* ─── Stats bar ──────────────────────────────────────────────────────── */
function StatsBar({ clip }: { clip: ClipData }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 animate-fade-in-up animation-delay-150">
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
  );
}

/* ─── Demo banner ────────────────────────────────────────────────────── */
function DemoBanner() {
  return (
    <div className="mb-5 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 animate-fade-in-up">
      <BookOpen size={14} className="text-primary" />
      <span className="text-xs font-medium text-primary">데모 클립 — 실제 클립을 추가하면 이 자리에 표시됩니다</span>
    </div>
  );
}

/* ─── Tags ───────────────────────────────────────────────────────────── */
const SEED_TAGS: Record<string, string[]> = {
  'seed-1': ['Next.js', 'React', 'Turbopack', 'SSR'],
  'seed-2': ['React', 'RSC', 'Server Components', 'Architecture'],
  'seed-3': ['AI', 'SDK', 'Streaming', 'OpenAI', 'LLM'],
  'seed-4': ['State Management', 'Redux', 'React', 'Opinion'],
  'seed-5': ['TypeScript', 'Tips', 'Generics', 'Patterns'],
  'seed-6': ['Tailwind', 'CSS', 'v4', 'Frontend'],
  'seed-7': ['PostgreSQL', 'Database', 'Performance', 'Indexing'],
  'seed-8': ['Frontend', 'Career', 'Roadmap', '2025'],
};

function TagList({ clipId }: { clipId: string }) {
  const tags = SEED_TAGS[clipId];
  if (!tags) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 animate-fade-in-up animation-delay-200">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Hash size={10} />
          {tag}
        </span>
      ))}
    </div>
  );
}


/* ─── Image slideshow component ───────────────────────────────────────── */
function ImageSlideshow({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);
  const [errored, setErrored] = useState<Set<number>>(new Set());

  const validImages = images.filter((_, i) => !errored.has(i));
  if (validImages.length === 0) return null;

  const displayIdx = Math.min(current, validImages.length - 1);
  const actualSrc = validImages[displayIdx];

  return (
    <div className="mb-5 animate-fade-in-up animation-delay-250">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 shadow-card">
        <div className="relative w-full" style={{ aspectRatio: '16/10' }}>
          <Image
            key={actualSrc}
            src={actualSrc}
            alt={`이미지 ${displayIdx + 1}/${validImages.length}`}
            fill
            unoptimized={!isProxiableImageUrl(actualSrc)}
            className={cn(
              'transition-opacity duration-300',
              validImages.length === 1 ? 'object-contain' : 'object-cover',
            )}
            sizes="(max-width: 768px) 100vw, 768px"
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
              className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-spring hover:bg-black/70"
              aria-label="이전 이미지"
            >
              &#8249;
            </button>
            <button
              onClick={() => setCurrent((p) => (p + 1) % validImages.length)}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-spring hover:bg-black/70"
              aria-label="다음 이미지"
            >
              &#8250;
            </button>
          </>
        )}
        {validImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {validImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === displayIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70',
                )}
                aria-label={`이미지 ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/* ─── Real content renderer ──────────────────────────────────────────── */
function RealContent({ clipContents, url, platform }: { clipContents: ClipContent[]; url: string; platform?: string }) {
  const first = clipContents[0];
  const text = first?.content_markdown ?? first?.raw_markdown;
  const rawContent = text || (first?.html_content ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const displayContent = cleanDisplayContent(rawContent);

  if (!displayContent) {
    return (
      <div className="mb-5 rounded-2xl border border-border/60 bg-glass card-inner-glow p-6 shadow-card animate-fade-in-up animation-delay-300">
        <p className="text-sm text-muted-foreground">본문 콘텐츠가 아직 수집되지 않았습니다.</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowUpRight size={13} />
          원본 페이지에서 읽기
        </a>
      </div>
    );
  }

  const isMarkdown = !!text;
  const { body, subContent } = splitContentSections(displayContent);
  const isThreads = platform === 'threads';

  return (
    <div className="mb-5 space-y-4">
      {/* Content section */}
      <div className="rounded-2xl border border-border/60 bg-glass card-inner-glow p-6 shadow-card animate-fade-in-up animation-delay-300">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <FileText size={12} className="text-muted-foreground" />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{isThreads ? '메인 스레드' : 'Content'}</h3>
          </div>
          <div className="h-px flex-1 bg-border/50" />
        </div>
        {isMarkdown ? (
          <MarkdownContent content={body} />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{body}</p>
        )}
      </div>

      {/* Sub-Contents section — Threads only */}
      {isThreads && subContent && (
        <div className="rounded-2xl border border-border/60 bg-glass card-inner-glow p-6 shadow-card animate-fade-in-up animation-delay-400">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <MessageSquare size={12} className="text-muted-foreground" />
              <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">서브 스레드</h3>
            </div>
            <div className="h-px flex-1 bg-border/50" />
          </div>
          {isMarkdown ? (
            <MarkdownContent content={subContent} />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{subContent}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
export function ClipDetailClient({ clipId }: Props) {
  const isSeed = clipId.startsWith('seed-');
  const seedClip = isSeed ? getSeedClip(clipId) : undefined;
  const seedContent = isSeed ? SEED_CONTENT[clipId] : undefined;

  const { data: apiClip, isLoading } = useClip(isSeed ? '' : clipId);
  const { data: categories = [] } = useCategories();
  const { data: highlights = [] } = useHighlights(isSeed ? '' : clipId);
  const createHighlight = useCreateHighlight(isSeed ? '' : clipId);
  const deleteHighlight = useDeleteHighlight(isSeed ? '' : clipId);
  const toggleFavorite = useToggleFavorite();
  const archiveClip = useToggleArchive();
  const { progress, update } = useReadingProgress(isSeed ? '' : clipId);

  const [scrollPct, setScrollPct] = useState(progress?.scroll_percentage ?? 0);
  const articleRef = useRef<HTMLDivElement>(null);

  // Reminder dialog state
  const [reminderOpen, setReminderOpen] = useState(false);

  // Activity section state
  const [activityOpen, setActivityOpen] = useState(false);

  // Share state — initialise from clip data once loaded
  const [isPublic, setIsPublic] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync from loaded clip
  useEffect(() => {
    if (apiClip) {
      setIsPublic(apiClip.is_public);
      if (apiClip.share_token && apiClip.is_public) {
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        setShareUrl(`${base}/s/${apiClip.share_token}`);
      }
    }
  }, [apiClip]);

  const enableShare = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/clips/${clipId}/share`, { method: 'POST' });
      if (!res.ok) throw new Error('공유 링크 생성에 실패했습니다');
      const json = (await res.json()) as { data: { shareUrl: string } };
      return json.data.shareUrl;
    },
    onSuccess: (url) => {
      setIsPublic(true);
      setShareUrl(url);
    },
    onError: () => toast.error('공유 링크 생성에 실패했습니다'),
  });

  const disableShare = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/clips/${clipId}/share`, { method: 'DELETE' });
      if (!res.ok) throw new Error('공유 링크 해제에 실패했습니다');
    },
    onSuccess: () => {
      setIsPublic(false);
      setShareUrl(null);
    },
    onError: () => toast.error('공유 링크 해제에 실패했습니다'),
  });

  async function handleCopyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('공유 링크가 복사되었습니다');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('복사에 실패했습니다');
    }
  }

  useEffect(() => {
    if (progress?.scroll_percentage != null) {
      setScrollPct(progress.scroll_percentage);
    }
  }, [progress?.scroll_percentage]);

  useEffect(() => {
    if (isSeed) return;

    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / docHeight) * 100));
      setScrollPct(pct);
      update({ scroll_percentage: pct });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isSeed, update]);

  const clip = seedClip ?? apiClip;
  const clipContents = !isSeed && apiClip ? apiClip.clip_contents : undefined;

  // 읽기 시간: clip.read_time 우선, 없으면 콘텐츠 텍스트로 추정
  const estimatedReadMinutes = useMemo(() => {
    if (clip?.read_time != null) return null; // DB 값 있으면 추정 불필요
    const text =
      (seedContent ?? '') ||
      (clipContents?.[0]?.content_markdown ??
      clipContents?.[0]?.raw_markdown ??
      clip?.summary ??
      '');
    if (!text) return null;
    return estimateReadingTime(text).minutes;
  }, [clip?.read_time, clip?.summary, seedContent, clipContents]);

  if (!isSeed && isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <Skeleton className="mb-6 h-5 w-24" />
        <Skeleton className="mb-4 h-9 w-3/4" />
        <Skeleton className="mb-2 h-4 w-1/2" />
        <Skeleton className="mb-6 h-5 w-32" />
        <Skeleton className="mt-6 h-56 w-full rounded-2xl" />
        <Skeleton className="mt-6 h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="flex flex-col items-center justify-center p-6 py-24 text-muted-foreground">
        <p className="text-lg font-bold text-foreground">클립을 찾을 수 없습니다</p>
        <p className="mt-1 text-sm">삭제되었거나 잘못된 링크일 수 있습니다.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-brand transition-spring hover:glow-brand hover:shadow-brand-lg"
        >
          <ArrowLeft size={14} />
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  const platform = clip.platform ?? 'web';
  const platformLabel =
    clip.platform
      ? (PLATFORM_LABELS[clip.platform as keyof typeof PLATFORM_LABELS]?.ko ?? clip.platform)
      : null;
  const platformColor = PLATFORM_COLORS[platform] ?? 'bg-gray-500';
  const platformIcon = PLATFORM_ICONS[platform] ?? '🌐';
  const category = clip.category_id
    ? categories.find((c) => c.id === clip.category_id)
    : undefined;

  return (
    <div ref={articleRef} className="animate-blur-in mx-auto max-w-3xl px-4 py-8 md:px-6">

      {/* Reading progress bar */}
      {!isSeed && (
        <div className="fixed left-0 top-0 z-[var(--z-sticky)] h-1 w-full bg-border/30">
          <div
            className="h-full bg-[#21DBA4] transition-[width] duration-300"
            style={{ width: `${scrollPct}%` }}
          />
        </div>
      )}

      {/* Breadcrumb */}
      <div className="mb-7">
        <Breadcrumbs
          items={[{ label: clip.title ?? '클립', href: undefined }]}
        />
      </div>

      {/* Demo banner */}
      {isSeed && <DemoBanner />}

      {/* Platform-specific hero */}
      <PlatformHero clip={clip} />

      {/* Image slideshow for platforms without custom hero (handles 1+ images) */}
      {!['youtube', 'github', 'twitter', 'reddit'].includes(platform) && (() => {
        const allImages = extractImagesFromContent(clipContents, clip.image);
        if (allImages.length === 0) return null;
        return <ImageSlideshow images={allImages} />;
      })()}

      {/* Header card */}
      <div className="mb-5 rounded-2xl border border-border/60 bg-glass card-inner-glow p-6 shadow-card animate-fade-in-up animation-delay-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Platform badge inline */}
            {(platformLabel || category) && (
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
                {category && (
                  <>
                    {platformLabel && <span className="text-xs text-muted-foreground/40">·</span>}
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: category.color ?? '#21DBA4' }}
                    />
                    <span className="text-xs font-semibold text-muted-foreground">{category.name}</span>
                  </>
                )}
              </div>
            )}
            <h1 className="text-2xl font-bold leading-snug tracking-tight text-foreground">
              {clip.title ?? '제목 없음'}
            </h1>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-1">
            {!isSeed && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl transition-spring hover:bg-yellow-500/10 hover:glow-brand-sm"
                  onClick={() =>
                    toggleFavorite.mutate({
                      clipId: clip.id,
                      isFavorite: !clip.is_favorite,
                    })
                  }
                  aria-label={clip.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                >
                  <Star
                    size={18}
                    className={
                      clip.is_favorite
                        ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgb(250,204,21)]'
                        : 'text-muted-foreground'
                    }
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl transition-spring hover:bg-muted hover:glow-brand-sm"
                  onClick={() =>
                    archiveClip.mutate({
                      clipId: clip.id,
                      isArchived: !clip.is_archived,
                    })
                  }
                  aria-label={clip.is_archived ? '아카이브 해제' : '아카이브'}
                >
                  <Archive
                    size={18}
                    className={clip.is_archived ? 'text-primary' : 'text-muted-foreground'}
                  />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl transition-spring hover:bg-muted hover:glow-brand-sm"
              asChild
            >
              <a
                href={clip.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="원본 페이지 열기"
              >
                <ExternalLink size={18} className="text-muted-foreground" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl transition-spring hover:bg-muted hover:glow-brand-sm"
              onClick={() => shareClip({ title: clip.title ?? clip.url, url: clip.url })}
              aria-label="공유"
            >
              <Share2 size={18} className="text-muted-foreground" />
            </Button>
            {!isSeed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl transition-spring hover:bg-primary/10 hover:glow-brand-sm"
                    onClick={() => setReminderOpen(true)}
                    aria-label={clip.remind_at ? '리마인더 수정' : '리마인더 설정'}
                  >
                    <Bell
                      size={18}
                      className={
                        clip.remind_at
                          ? 'fill-primary text-primary drop-shadow-[0_0_6px_rgb(33,219,164,0.6)]'
                          : 'text-muted-foreground'
                      }
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {clip.remind_at
                    ? `리마인더: ${new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(clip.remind_at))}`
                    : '리마인더 설정'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {clip.author && (
            <span className="rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              {clip.author}
            </span>
          )}
          {(clip.read_time != null || estimatedReadMinutes != null) && (
            <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              <Clock size={11} />
              약 {clip.read_time ?? estimatedReadMinutes}분 읽기
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <Calendar size={11} />
            {formatRelativeTime(clip.created_at)}
          </span>
          {!isSeed && highlights.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              <Highlighter size={11} />
              하이라이트 {highlights.length}개
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <StatsBar clip={clip} />

      {/* Tags */}
      {isSeed && <TagList clipId={clipId} />}
      {!isSeed && <ClipTagEditor clipId={clipId} />}

      {/* Category + Collection assignment */}
      {!isSeed && (
        <div className="relative z-[60] mb-5 flex flex-wrap items-center gap-2 animate-fade-in-up animation-delay-200">
          <ClipCategorySelector clipId={clipId} currentCategoryId={clip.category_id ?? null} />
          <ClipCollectionAssigner clipId={clipId} />
        </div>
      )}

      {/* 공유 링크 */}
      {!isSeed && (
        <div className="mb-5 rounded-2xl border border-border/60 bg-glass card-inner-glow p-5 shadow-card animate-fade-in-up animation-delay-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {isPublic ? (
                <Link2 size={15} className="shrink-0 text-primary" />
              ) : (
                <Link2Off size={15} className="shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">공유 링크</p>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? '누구나 이 링크로 클립을 볼 수 있습니다' : '이 클립은 비공개입니다'}
                </p>
              </div>
            </div>
            <Button
              variant={isPublic ? 'destructive' : 'outline'}
              size="sm"
              className="shrink-0 rounded-xl text-xs"
              disabled={enableShare.isPending || disableShare.isPending}
              onClick={() => isPublic ? disableShare.mutate() : enableShare.mutate()}
            >
              {isPublic ? '공유 해제' : '공유 링크 생성'}
            </Button>
          </div>

          {isPublic && shareUrl && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
              <span className="flex-1 truncate text-xs text-foreground/70">{shareUrl}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 rounded-lg"
                onClick={handleCopyShareUrl}
                aria-label="링크 복사"
              >
                {copied ? (
                  <Check size={13} className="text-primary" />
                ) : (
                  <Copy size={13} className="text-muted-foreground" />
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {clip.summary && !['twitter', 'reddit'].includes(platform) && (
        <div className="mb-5 rounded-2xl border border-border/60 bg-glass card-inner-glow p-6 shadow-card animate-fade-in-up animation-delay-200">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-gradient-brand text-[11px] font-bold uppercase tracking-[0.14em]">
              AI 요약
            </h2>
            <div className="divider-gradient flex-1" />
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{clip.summary}</p>
        </div>
      )}

      {/* Full content (seed clips only) */}
      {seedContent && (
        <div className="mb-5 rounded-2xl border border-border/60 bg-glass card-inner-glow p-6 shadow-card animate-fade-in-up animation-delay-300">
          <MarkdownContent content={seedContent} />
        </div>
      )}

      {/* Full content (real clips) — wrapped with TextHighlighter */}
      {clipContents && (
        <TextHighlighter
          highlights={highlights}
          onCreateHighlight={(input) => createHighlight.mutate(input)}
          onDeleteHighlight={(id) => deleteHighlight.mutate(id)}
          disabled={isSeed}
        >
          <RealContent clipContents={clipContents} url={clip.url} platform={clip.platform ?? undefined} />
        </TextHighlighter>
      )}

      {/* Personal notes (non-seed clips only) */}
      {!isSeed && (
        <ClipNotes
          clipId={clipId}
          initialNotes={(clip as ClipData & { notes?: string | null }).notes}
        />
      )}

      {/* Activity log (non-seed only) */}
      {!isSeed && (
        <div className="mb-5 animate-fade-in-up animation-delay-400">
          <button
            type="button"
            onClick={() => setActivityOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-glass card-inner-glow px-5 py-4 shadow-card transition-colors hover:border-border"
          >
            <div className="flex items-center gap-2.5">
              <History size={15} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">활동 기록</span>
            </div>
            {activityOpen ? (
              <ChevronUp size={16} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={16} className="text-muted-foreground" />
            )}
          </button>

          {activityOpen && (
            <div className="mt-1 rounded-2xl border border-border/60 bg-glass p-5 shadow-card">
              <ClipActivityTimeline clipId={clipId} />
            </div>
          )}
        </div>
      )}

      {/* Related clips */}
      {!isSeed && (
        <div className="mb-5 animate-fade-in-up animation-delay-400">
          <RelatedClips clipId={clipId} />
        </div>
      )}

      {/* Source link */}
      <div className="animate-fade-in-up animation-delay-400">
        <a
          href={clip.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-card transition-spring hover:border-primary/40 hover:glow-brand-sm hover:shadow-elevated hover-lift"
        >
          <ArrowUpRight size={14} className="text-primary" />
          원본 페이지 열기
        </a>
      </div>

      {/* Reminder dialog */}
      {!isSeed && (
        <ReminderDialog
          open={reminderOpen}
          onOpenChange={setReminderOpen}
          clipId={clipId}
          currentRemindAt={(clip as ClipData).remind_at}
        />
      )}
    </div>
  );
}
