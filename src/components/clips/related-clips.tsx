'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ExternalLink, Hash } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {clips.map((clip) => {
          const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();
          const gradient = getGradient(clip.id);

          return (
            <Card
              key={clip.id}
              onClick={() => router.push(`/clip/${clip.id}`)}
              className="flex cursor-pointer items-start gap-2 p-2.5 transition-shadow hover:shadow-md"
            >
              {/* 썸네일 */}
              <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {clip.image ? (
                  <Image
                    src={clip.image}
                    alt={clip.title ?? ''}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div
                    className={cn(
                      'flex h-full w-full items-center justify-center bg-gradient-to-br',
                      gradient
                    )}
                  >
                    <span className="text-lg font-bold text-white">{firstLetter}</span>
                  </div>
                )}
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <p className="line-clamp-2 text-xs font-medium leading-snug">
                  {clip.title ?? clip.url}
                </p>

                {/* 공통 태그 뱃지 */}
                {clip.commonTags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {clip.commonTags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-0.5 rounded-full border border-primary/30 bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                      >
                        <Hash size={8} />
                        {tag}
                      </span>
                    ))}
                    {clip.commonTags.length > 3 && (
                      <span className="rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        +{clip.commonTags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-1 flex items-center gap-2">
                  {clip.platform && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {clip.platform}
                    </span>
                  )}
                  {clip.similarity > 0 && (
                    <span className="text-xs text-primary font-medium">
                      {Math.round(clip.similarity * 100)}% 일치
                    </span>
                  )}
                  <a
                    href={clip.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    aria-label="원본 링크 열기"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </Card>
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
