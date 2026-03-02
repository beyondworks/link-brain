'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { useClip } from '@/lib/hooks/use-clips';
import { useToggleFavorite } from '@/hooks/mutations/use-toggle-favorite';
import { useArchiveClip } from '@/hooks/mutations/use-archive-clip';
import { useReadingProgress } from '@/hooks/mutations/use-reading-progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  Play,
  GitFork,
  StarIcon,
  MessageSquare,
  Repeat2,
  ArrowUpRight,
  BookOpen,
  Hash,
} from 'lucide-react';
import Link from 'next/link';
import { cn, formatRelativeTime } from '@/lib/utils';
import { shareClip } from '@/lib/utils/share';
import { ClipTagEditor } from '@/components/clips/clip-tag-editor';
import { ClipCollectionAssigner } from '@/components/clips/clip-collection-assigner';
import { PLATFORM_LABELS } from '@/config/constants';
import { getSeedClip, SEED_CONTENT } from '@/config/seed-clips';
import type { ClipData, ClipContent } from '@/types/database';

interface Props {
  clipId: string;
}

/* ─── Platform badge colors ─────────────────────────────────────────────── */
const PLATFORM_COLORS: Record<string, string> = {
  web: 'bg-gray-500',
  youtube: 'bg-red-500',
  github: 'bg-gray-800',
  twitter: 'bg-sky-500',
  medium: 'bg-gray-700',
  reddit: 'bg-orange-600',
  substack: 'bg-orange-500',
  linkedin: 'bg-blue-600',
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
};

/* ─── Simple markdown → JSX renderer (headings, code, tables, blockquotes) */
function MarkdownContent({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className="prose-custom space-y-4">
      {blocks.map((block, i) => (
        <MarkdownBlock key={i} block={block} />
      ))}
    </div>
  );
}

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'p'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; lang: string; lines: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'list'; items: string[] };

function parseMarkdown(md: string): Block[] {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', lang, lines: codeLines });
      i++;
      continue;
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1]?.includes('---')) {
      const headers = line.split('|').map((c) => c.trim()).filter(Boolean);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').map((c) => c.trim()).filter(Boolean));
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Headings
    if (line.startsWith('#### ')) {
      blocks.push({ type: 'h4', text: line.slice(5) });
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4) });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3) });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    // List items
    if (line.startsWith('- ') || /^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || /^\d+\.\s/.test(lines[i]))) {
        items.push(lines[i].replace(/^[-\d.]+\s/, ''));
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Paragraph
    if (line.trim()) {
      blocks.push({ type: 'p', text: line });
    }
    i++;
  }

  return blocks;
}

function InlineCode({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') ? (
          <code key={i} className="rounded bg-muted/80 px-1.5 py-0.5 text-[13px] font-mono text-primary">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{boldItalic(part)}</span>
        )
      )}
    </>
  );
}

function boldItalic(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function MarkdownBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'h2':
      return (
        <div className="flex items-center gap-3 pt-2">
          <h2 className="text-gradient-brand text-[11px] font-bold uppercase tracking-[0.14em]">
            {block.text}
          </h2>
          <div className="divider-gradient flex-1" />
        </div>
      );
    case 'h3':
      return <h3 className="pt-1 text-base font-bold text-foreground">{block.text}</h3>;
    case 'h4':
      return <h4 className="text-sm font-semibold text-foreground/90">{block.text}</h4>;
    case 'p':
      return (
        <p className="text-sm leading-relaxed text-foreground/80">
          <InlineCode text={block.text} />
        </p>
      );
    case 'blockquote':
      return (
        <blockquote className="border-l-2 border-primary/40 bg-primary/5 py-2 pl-4 pr-3 rounded-r-lg">
          <p className="text-sm italic leading-relaxed text-foreground/70">
            <InlineCode text={block.text} />
          </p>
        </blockquote>
      );
    case 'code':
      return (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-gray-950">
          {block.lang && (
            <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2">
              <span className="text-[11px] font-medium text-white/50">{block.lang}</span>
            </div>
          )}
          <pre className="overflow-x-auto p-4">
            <code className="text-[13px] leading-relaxed text-green-300/90 font-mono">
              {block.lines.join('\n')}
            </code>
          </pre>
        </div>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-foreground/70">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/30 last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-xs text-foreground/70">
                      <InlineCode text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'list':
      return (
        <ul className="space-y-1.5 pl-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground/80">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <InlineCode text={item} />
            </li>
          ))}
        </ul>
      );
  }
}

/* ─── Platform-specific hero sections ────────────────────────────────── */
function PlatformHero({ clip }: { clip: ClipData }) {
  const platform = clip.platform ?? 'web';

  switch (platform) {
    case 'youtube':
      return (
        <div className="mb-7 animate-fade-in-up">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-gray-950 shadow-card">
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-red-600/20 to-red-900/40">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform hover:scale-110">
                <Play size={28} className="ml-1 text-white" fill="white" />
              </div>
              <p className="mt-4 text-sm font-medium text-white/70">YouTube 동영상</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-lg font-bold text-white">{clip.title}</p>
              <p className="mt-1 text-sm text-white/60">{clip.author} · {clip.read_time ? `${clip.read_time}분` : ''}</p>
            </div>
          </div>
        </div>
      );

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
              <StarIcon size={14} fill="currentColor" /> 12.4k
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

/* ─── Real content renderer ──────────────────────────────────────────── */
function RealContent({ clipContents, url }: { clipContents: ClipContent[]; url: string }) {
  const first = clipContents[0];
  const text = first?.content_markdown ?? first?.raw_markdown;

  if (text) {
    return (
      <div className="mb-5 rounded-2xl border border-border/60 bg-glass card-inner-glow p-6 shadow-card animate-fade-in-up animation-delay-300">
        <MarkdownContent content={text} />
      </div>
    );
  }

  if (first?.html_content) {
    // Render HTML as plain text (strip tags) — no sanitizer available
    const plainText = first.html_content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return (
      <div className="mb-5 rounded-2xl border border-border/60 bg-glass card-inner-glow p-6 shadow-card animate-fade-in-up animation-delay-300">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{plainText}</p>
      </div>
    );
  }

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

/* ─── Main component ─────────────────────────────────────────────────── */
export function ClipDetailClient({ clipId }: Props) {
  const isSeed = clipId.startsWith('seed-');
  const seedClip = isSeed ? getSeedClip(clipId) : undefined;
  const seedContent = isSeed ? SEED_CONTENT[clipId] : undefined;

  const { data: apiClip, isLoading } = useClip(isSeed ? '' : clipId);
  const toggleFavorite = useToggleFavorite();
  const archiveClip = useArchiveClip();
  const { progress, update } = useReadingProgress(isSeed ? '' : clipId);

  const [scrollPct, setScrollPct] = useState(progress?.scroll_percentage ?? 0);
  const articleRef = useRef<HTMLDivElement>(null);

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

      {/* Back */}
      <Link
        href="/dashboard"
        className="mb-7 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-spring hover:bg-accent hover:text-foreground hover-lift"
      >
        <ArrowLeft size={15} />
        돌아가기
      </Link>

      {/* Demo banner */}
      {isSeed && <DemoBanner />}

      {/* Platform-specific hero */}
      <PlatformHero clip={clip} />

      {/* OG Image fallback for platforms without custom hero */}
      {!['youtube', 'github', 'twitter', 'reddit'].includes(platform) && clip.image && (
        <div className="card-glow mb-7 overflow-hidden rounded-2xl border border-border/60 shadow-card animate-fade-in-up">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={clip.image} alt={clip.title ?? ''} className="w-full object-cover" />
        </div>
      )}

      {/* Header card */}
      <div className="mb-5 rounded-2xl border border-border/60 bg-glass card-inner-glow p-6 shadow-card animate-fade-in-up animation-delay-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Platform badge inline */}
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
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
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
      </div>

      {/* Stats */}
      <StatsBar clip={clip} />

      {/* Tags */}
      {isSeed && <TagList clipId={clipId} />}
      {!isSeed && <ClipTagEditor clipId={clipId} />}

      {/* Collection assignment */}
      {!isSeed && (
        <div className="mb-5 animate-fade-in-up animation-delay-200">
          <ClipCollectionAssigner clipId={clipId} />
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

      {/* Full content (real clips) */}
      {clipContents && (
        <RealContent clipContents={clipContents} url={clip.url} />
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
    </div>
  );
}
