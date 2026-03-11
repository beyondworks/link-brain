'use client';

import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, BookmarkPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useUIStore } from '@/stores/ui-store';
import { formatRelativeTime } from '@/lib/utils';
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
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 animate-pulse items-center justify-center rounded-full bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
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

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">나중에 읽기</h2>

      {isLoading && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <ReadLaterSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && (error || !clips || clips.length === 0) && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 py-8 text-center">
          <BookmarkPlus className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">나중에 읽을 클립이 없습니다.</p>
        </div>
      )}

      {!isLoading && clips && clips.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-2">
          {clips.map((clip, index) => (
            <button
              key={clip.id}
              type="button"
              onClick={() => openClipPeek(clip.id)}
              className="relative flex w-full items-start gap-3 py-2.5 text-left"
            >
              {/* vertical line */}
              {index < clips.length - 1 && (
                <span
                  className="absolute left-3.5 top-9 h-full w-px -translate-x-1/2 bg-border/50"
                  aria-hidden="true"
                />
              )}

              {/* dot + icon */}
              <div className="z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                <BookOpen size={13} className="text-primary" />
              </div>

              {/* text */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="line-clamp-1 text-sm font-medium text-foreground">
                  {clip.title ?? clip.url}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground" suppressHydrationWarning>
                  {formatRelativeTime(clip.created_at)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export const ReadLaterList = memo(
  ReadLaterListComponent,
  (prev, next) => prev.userId === next.userId
);
