'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { ClipData, ReadingProgress } from '@/types/database';

interface ContinueReadingProps {
  userId: string;
}

interface ProgressWithClip {
  clip: ClipData;
  scroll_percentage: number;
  last_read_at: string;
}

const GRADIENT_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
];

function getGradient(id: string): string {
  return GRADIENT_COLORS[id.charCodeAt(0) % GRADIENT_COLORS.length];
}

async function fetchContinueReading(userId: string): Promise<ProgressWithClip[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = await db
    .from('reading_progress')
    .select('clip_id, scroll_percentage, last_read_at')
    .eq('user_id', userId)
    .gt('scroll_percentage', 0)
    .lt('scroll_percentage', 100)
    .order('last_read_at', { ascending: false })
    .limit(5);

  if (error) throw new Error('이어 읽기 데이터 로드 실패');

  const rows = (data as Array<Pick<ReadingProgress, 'clip_id' | 'scroll_percentage' | 'last_read_at'>>) ?? [];
  if (rows.length === 0) return [];

  const clipIds = rows.map((r) => r.clip_id);

  const { data: clipsData, error: clipsErr } = await db
    .from('clips')
    .select('id, user_id, url, title, image, platform, summary, created_at, updated_at, author, author_handle, author_avatar, read_time, ai_score, is_favorite, is_read_later, is_archived, is_public, category_id, views, likes_count')
    .in('id', clipIds);

  if (clipsErr) throw new Error('클립 데이터 로드 실패');

  const clipsMap = new Map<string, ClipData>(
    ((clipsData as ClipData[]) ?? []).map((c) => [c.id, c])
  );

  return rows
    .map((row) => {
      const clip = clipsMap.get(row.clip_id);
      if (!clip) return null;
      return {
        clip,
        scroll_percentage: row.scroll_percentage,
        last_read_at: row.last_read_at,
      };
    })
    .filter((item): item is ProgressWithClip => item !== null);
}

function ContinueReadingSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-12 w-16 flex-shrink-0 rounded-md" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

export function ContinueReading({ userId }: ContinueReadingProps) {
  const router = useRouter();

  const { data: items, isLoading, error } = useQuery({
    queryKey: ['continue-reading', userId],
    queryFn: () => fetchContinueReading(userId),
    staleTime: 30_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">이어 읽기</h2>
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <ContinueReadingSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (error || !items || items.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">이어 읽기</h2>
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">읽기 중인 클립이 없습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">이어 읽기</h2>
      <div className="space-y-1">
        {items.map(({ clip, scroll_percentage, last_read_at }) => {
          const firstLetter = (clip.title ?? clip.url).charAt(0).toUpperCase();
          const gradient = getGradient(clip.id);
          const lastReadDate = new Date(last_read_at).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <Card
              key={clip.id}
              onClick={() => router.push(`/clip/${clip.id}`)}
              className="flex cursor-pointer items-center gap-3 p-3 transition-shadow hover:shadow-md"
            >
              {/* 썸네일 */}
              <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                {clip.image ? (
                  <Image
                    src={clip.image}
                    alt={clip.title ?? ''}
                    fill
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

              {/* 내용 */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="line-clamp-1 text-sm font-medium leading-snug">
                  {clip.title ?? clip.url}
                </p>

                {/* 프로그레스 바 */}
                <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${scroll_percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {scroll_percentage}% 읽음
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lastReadDate}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
