'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bookmark, Eye } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { isProxiableImageUrl } from '@/lib/utils/clip-content';
import { PLATFORM_COLORS, PLATFORM_LABELS_EN } from '@/config/constants';
import type { ExploreClip } from '@/lib/hooks/use-explore';
import { ImportClipButton } from './import-clip-button';

export function ExploreCardSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl border-border/60 p-0 gap-0">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-20" />
      </div>
    </Card>
  );
}

/**
 * 탐색 카드. 익명 공개 라이브러리이므로 저장한 사용자 정보는 표시하지 않는다.
 * 링크는 항상 공개 페이지(/p/{id}) — /clip/{id}는 인증 전용이라 비로그인 방문자가 튕긴다.
 */
export function ExploreCard({ clip }: { clip: ExploreClip }) {
  const platformLabel = PLATFORM_LABELS_EN[clip.platform] ?? clip.platform;
  const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();

  return (
    <Link href={`/p/${clip.id}`} className="h-full">
      <Card className="group flex h-full flex-col overflow-hidden rounded-2xl border-border/60 p-0 gap-0 transition-spring hover:border-border hover:shadow-card-hover">
        {/* Thumbnail */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {clip.thumbnailUrl ? (
            <Image
              src={clip.thumbnailUrl}
              alt={clip.title ?? ''}
              fill
              unoptimized={!isProxiableImageUrl(clip.thumbnailUrl)}
              className="img-zoom object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: 'var(--thumbnail-fallback)' }}
            >
              <span className="text-4xl font-black text-muted-foreground/30">
                {firstLetter}
              </span>
            </div>
          )}

          {/* Platform + category badge */}
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-glass px-2.5 py-1 backdrop-blur-md">
            <span
              className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                PLATFORM_COLORS[clip.platform] ?? 'bg-gray-400'
              }`}
            />
            <span className="text-[10px] font-semibold text-foreground/90">
              {platformLabel}
            </span>
            {clip.category && (
              <span className="text-[10px] font-medium text-foreground/60">
                · {clip.category}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            {clip.title ?? '제목 없음'}
          </h3>

          {clip.summary && (
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {clip.summary}
            </p>
          )}

          {/* Footer: time + 익명 인기 지표 */}
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <div className="flex min-w-0 items-center gap-2.5 text-xs text-subtle">
              <span suppressHydrationWarning>{formatRelativeTime(clip.createdAt)}</span>
              {clip.saveCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <Bookmark className="h-3 w-3" />
                  {clip.saveCount}명 저장
                </span>
              )}
              {clip.views > 0 && (
                <span className="flex items-center gap-0.5">
                  <Eye className="h-3 w-3" />
                  {clip.views}
                </span>
              )}
            </div>

            <ImportClipButton clipId={clip.id} size="xs" stopPropagation />
          </div>
        </div>
      </Card>
    </Link>
  );
}
