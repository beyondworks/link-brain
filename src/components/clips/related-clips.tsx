'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ExternalLink, Hash } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getGradient } from '@/config/constants';
import { useRelatedClips } from '@/lib/hooks/use-related-clips';

interface RelatedClipsProps {
  clipId: string;
}

function RelatedClipSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton className="h-14 w-20 flex-shrink-0 rounded-md" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

function RelatedClipsComponent({ clipId }: RelatedClipsProps) {
  const router = useRouter();
  const { clips, isLoading } = useRelatedClips(clipId);

  if (isLoading) {
    return (
      <div className="space-y-1">
        <h3 className="mb-2 text-sm font-semibold text-foreground">관련 클립</h3>
        {Array.from({ length: 3 }).map((_, i) => (
          <RelatedClipSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (clips.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="mb-2 text-sm font-semibold text-foreground">관련 클립</h3>
      <div className="divide-y divide-border/60">
        {clips.map((clip) => {
          const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();
          const gradient = getGradient(clip.id);

          return (
            <div
              key={clip.id}
              onClick={() => router.push(`/clip/${clip.id}`)}
              className="flex cursor-pointer items-center gap-3 py-3 transition-colors hover:bg-muted/30"
            >
              {/* 썸네일 */}
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                {clip.image ? (
                  <Image
                    src={clip.image}
                    alt={clip.title ?? ''}
                    fill
                    className="object-cover"
                    sizes="48px"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    className={cn(
                      'flex h-full w-full items-center justify-center bg-gradient-to-br',
                      gradient
                    )}
                  >
                    <span className="text-sm font-bold text-white">{firstLetter}</span>
                  </div>
                )}
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <p className="line-clamp-1 text-sm font-medium text-foreground">
                  {clip.title ?? clip.url}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  {clip.platform && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {clip.platform}
                    </span>
                  )}
                  {clip.commonTags.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-primary">
                      <Hash size={8} />
                      {clip.commonTags[0]}
                    </span>
                  )}
                  {clip.similarity > 0 && (
                    <span className="text-xs text-primary font-medium">
                      {Math.round(clip.similarity * 100)}%
                    </span>
                  )}
                </div>
              </div>

              {/* 외부 링크 */}
              <a
                href={clip.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 p-1 text-muted-foreground/50 hover:text-foreground"
                aria-label="원본 링크 열기"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const RelatedClips = memo(
  RelatedClipsComponent,
  (prev, next) => prev.clipId === next.clipId
);
