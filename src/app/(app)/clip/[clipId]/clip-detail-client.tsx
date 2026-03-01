'use client';

import { useClip } from '@/lib/hooks/use-clips';
import { useToggleFavorite } from '@/hooks/mutations/use-toggle-favorite';
import { useArchiveClip } from '@/hooks/mutations/use-archive-clip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Star,
  Archive,
  ExternalLink,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { PLATFORM_LABELS } from '@/config/constants';

interface Props {
  clipId: string;
}

export function ClipDetailClient({ clipId }: Props) {
  const { data: clip, isLoading } = useClip(clipId);
  const toggleFavorite = useToggleFavorite();
  const archiveClip = useArchiveClip();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Skeleton className="mb-4 h-8 w-3/4" />
        <Skeleton className="mb-2 h-4 w-1/2" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="flex flex-col items-center justify-center p-6 py-20 text-muted-foreground">
        <p className="text-lg font-medium">클립을 찾을 수 없습니다</p>
        <Link href="/dashboard" className="mt-4 text-primary hover:underline">
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Back button */}
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        돌아가기
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold leading-tight">
            {clip.title ?? '제목 없음'}
          </h1>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                toggleFavorite.mutate({
                  clipId: clip.id,
                  isFavorite: !clip.is_favorite,
                })
              }
            >
              <Star
                size={18}
                className={clip.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                archiveClip.mutate({
                  clipId: clip.id,
                  isArchived: !clip.is_archived,
                })
              }
            >
              <Archive size={18} />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a href={clip.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={18} />
              </a>
            </Button>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {clip.platform && (
            <Badge variant="secondary">
              {PLATFORM_LABELS[clip.platform as keyof typeof PLATFORM_LABELS]?.ko ?? clip.platform}
            </Badge>
          )}
          {clip.author && <span>{clip.author}</span>}
          {clip.read_time != null && (
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {Math.ceil(clip.read_time / 60)}분
            </span>
          )}
          <span>{formatRelativeTime(clip.created_at)}</span>
        </div>
      </div>

      {/* Summary */}
      {clip.summary && (
        <div className="mb-6 rounded-lg bg-muted/50 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            요약
          </h2>
          <p className="text-sm leading-relaxed">{clip.summary}</p>
        </div>
      )}

      {/* Image */}
      {clip.image && (
        <div className="mb-6 overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={clip.image}
            alt={clip.title ?? ''}
            className="w-full object-cover"
          />
        </div>
      )}

      {/* Source link */}
      <div className="mt-8 border-t border-border pt-4">
        <a
          href={clip.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink size={14} />
          원본 페이지 열기
        </a>
      </div>
    </div>
  );
}
