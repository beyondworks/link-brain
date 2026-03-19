'use client';

import { memo } from 'react';
import { useClip } from '@/lib/hooks/use-clips';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen } from 'lucide-react';
import { PLATFORM_LABELS_EN } from '@/config/constants';
import type { ClipContent } from '@/types/database';

interface StudioClipPreviewProps {
  clipId: string | null;
}

function StudioClipPreviewInner({ clipId }: StudioClipPreviewProps) {
  const { data: clip, isLoading, error } = useClip(clipId);

  if (!clipId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <BookOpen size={32} className="text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          클립을 선택하면 미리보기가 표시됩니다
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-5 w-3/4 shimmer" />
        <Skeleton className="h-32 w-full rounded-xl shimmer" />
        <Skeleton className="h-4 w-full shimmer" />
        <Skeleton className="h-4 w-2/3 shimmer" />
      </div>
    );
  }

  if (error || !clip) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">미리보기를 불러올 수 없습니다</p>
      </div>
    );
  }

  const contents = Array.isArray(clip.clip_contents)
    ? clip.clip_contents
    : clip.clip_contents
      ? [clip.clip_contents as unknown as ClipContent]
      : [];
  const contentMarkdown = contents[0]?.content_markdown ?? null;

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-1">
      <h3 className="text-lg font-bold leading-snug text-foreground line-clamp-2">
        {clip.title ?? clip.url}
      </h3>

      {clip.image && (
        <img
          src={clip.image}
          alt={clip.title ?? ''}
          className="w-full max-h-48 rounded-xl object-cover"
        />
      )}

      {clip.summary && (
        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-4">
          {clip.summary}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {clip.platform && (
          <Badge variant="secondary" className="text-xs">
            {PLATFORM_LABELS_EN[clip.platform] ?? clip.platform}
          </Badge>
        )}
      </div>

      {contentMarkdown && (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap line-clamp-[12]">
            {contentMarkdown.slice(0, 500)}
          </p>
        </div>
      )}
    </div>
  );
}

export const StudioClipPreview = memo(StudioClipPreviewInner);
