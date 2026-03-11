'use client';

import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { BookmarkPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase/client';
import { useUIStore } from '@/stores/ui-store';
import { cn, formatRelativeTime } from '@/lib/utils';
import { getGradient } from '@/config/constants';
import { isProxiableImageUrl } from '@/lib/utils/clip-content';
import type { ClipData } from '@/types/database';

interface ReadLaterListProps {
  userId: string;
}

async function fetchReadLaterClips(userId: string): Promise<ClipData[]> {
  const { data, error } = await supabase
    .from('clips')
    .select('id, user_id, url, title, image, platform, summary, created_at, updated_at, author, author_handle, author_avatar, read_time, ai_score, is_favorite, is_read_later, is_archived, is_public, category_id, views, likes_count')
    .eq('user_id', userId)
    .eq('is_read_later', true)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error) throw new Error('나중에 읽기 로드 실패');
  return (data as ClipData[]) ?? [];
}

function ReadLaterSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-12 w-16 flex-shrink-0 rounded-md" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function ReadLaterListComponent({ userId }: ReadLaterListProps) {
  const openClipPeek = useUIStore((s) => s.openClipPeek);

  const { data: clips, isLoading, error } = useQuery({
    queryKey: ['read-later-list', userId],
    queryFn: () => fetchReadLaterClips(userId),
    staleTime: 30_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">나중에 읽기</h2>
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <ReadLaterSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (error || !clips || clips.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">나중에 읽기</h2>
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
          <BookmarkPlus className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">나중에 읽을 클립이 없습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">나중에 읽기</h2>
      <div className="space-y-1">
        {clips.map((clip) => {
          const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();
          const gradient = getGradient(clip.id);

          return (
            <Card
              key={clip.id}
              onClick={() => openClipPeek(clip.id)}
              className="flex cursor-pointer items-center gap-3 p-3 transition-shadow hover:shadow-md"
            >
              <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {clip.image ? (
                  <Image
                    src={clip.image}
                    alt={clip.title ?? ''}
                    fill
                    unoptimized={!isProxiableImageUrl(clip.image)}
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div
                    className={cn(
                      'flex h-full w-full items-center justify-center bg-gradient-to-br',
                      gradient
                    )}
                  >
                    <span className="text-base font-bold text-white">{firstLetter}</span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <p className="line-clamp-1 text-sm font-medium leading-snug">
                  {clip.title ?? clip.url}
                </p>
                <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                  {formatRelativeTime(clip.created_at)}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export const ReadLaterList = memo(
  ReadLaterListComponent,
  (prev, next) => prev.userId === next.userId
);
