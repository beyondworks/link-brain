'use client';

import { useQuery } from '@tanstack/react-query';
import { BookmarkPlus, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import type { ClipData } from '@/types/database';

interface RecentActivityProps {
  userId: string;
}

interface ActivityItem {
  id: string;
  title: string;
  url: string;
  created_at: string;
}

async function fetchRecentActivity(userId: string): Promise<ActivityItem[]> {
  const { data, error } = await supabase
    .from('clips')
    .select('id, title, url, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw new Error('최근 활동 로드 실패');

  return ((data as Pick<ClipData, 'id' | 'title' | 'url' | 'created_at'>[]) ?? []).map((row) => ({
    id: row.id,
    title: row.title ?? row.url,
    url: row.url,
    created_at: row.created_at,
  }));
}

function ActivitySkeleton() {
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

export function RecentActivity({ userId }: RecentActivityProps) {
  const { data: items, isLoading, error } = useQuery({
    queryKey: ['recent-activity', userId],
    queryFn: () => fetchRecentActivity(userId),
    staleTime: 60_000,
    retry: false,
  });

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">최근 활동</h2>

      {isLoading && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <ActivitySkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && (error || !items || items.length === 0) && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 py-8 text-center">
          <Clock className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">저장한 클립이 없습니다.</p>
        </div>
      )}

      {!isLoading && items && items.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card px-4 py-2">
          {items.map((item, index) => (
            <div key={item.id} className="relative flex items-start gap-3 py-2.5">
              {/* vertical line */}
              {index < items.length - 1 && (
                <span
                  className="absolute left-3.5 top-9 h-full w-px -translate-x-1/2 bg-border/50"
                  aria-hidden="true"
                />
              )}

              {/* dot + icon */}
              <div className="z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                <BookmarkPlus size={13} className="text-primary" />
              </div>

              {/* text */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="line-clamp-1 text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground" suppressHydrationWarning>
                  클립 저장 · {formatRelativeTime(item.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
