'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import type { ReadingProgress } from '@/types/database';

interface UseReadingProgressOptions {
  clipId: string;
  /** ref to the scrollable article container */
  containerRef: React.RefObject<HTMLElement | null>;
  /** debounce interval in ms before persisting to DB (default 2000) */
  debounceMs?: number;
}

interface UseReadingProgressReturn {
  /** 0–100 read percentage */
  progress: number;
  isCompleted: boolean;
  timeSpentSeconds: number;
}

export function useReadingProgress({
  clipId,
  containerRef,
  debounceMs = 2000,
}: UseReadingProgressOptions): UseReadingProgressReturn {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestProgressRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  // Load existing progress
  const { data: savedProgress } = useQuery({
    queryKey: ['reading-progress', clipId, user?.id],
    queryFn: async () => {
      if (!user || !clipId) return null;
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('clip_id', clipId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as ReadingProgress | null;
    },
    enabled: !!user && !!clipId,
    staleTime: 60_000,
  });

  // Upsert progress to DB
  const upsertMutation = useMutation({
    mutationFn: async ({
      scrollPercentage,
      timeSpent,
      completed,
    }: {
      scrollPercentage: number;
      timeSpent: number;
      completed: boolean;
    }) => {
      if (!user || !clipId) return;
      const { error } = await supabase.from('reading_progress').upsert(
        {
          clip_id: clipId,
          user_id: user.id,
          scroll_percentage: scrollPercentage,
          time_spent_seconds: timeSpent,
          completed_at: completed ? new Date().toISOString() : null,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'clip_id,user_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-progress', clipId, user?.id] });
    },
  });

  // Restore saved progress on mount
  useEffect(() => {
    if (savedProgress) {
      setProgress(savedProgress.scroll_percentage);
      setIsCompleted(savedProgress.completed_at != null);
      setTimeSpentSeconds(savedProgress.time_spent_seconds);
      latestProgressRef.current = savedProgress.scroll_percentage;
    }
  }, [savedProgress]);

  // Track time spent on page
  useEffect(() => {
    if (!user || !clipId) return;
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeSpentSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, clipId]);

  // Debounced persist helper
  const schedulePersist = useCallback(
    (scrollPct: number, timeSpent: number, completed: boolean) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        upsertMutation.mutate({
          scrollPercentage: scrollPct,
          timeSpent,
          completed,
        });
      }, debounceMs);
    },
    [debounceMs, upsertMutation]
  );

  // Scroll listener
  useEffect(() => {
    if (!user || !clipId) return;
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      if (scrollHeight <= 0) return;

      const pct = Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
      if (pct <= latestProgressRef.current) return; // only advance, never regress

      latestProgressRef.current = pct;
      setProgress(pct);

      const nowCompleted = pct >= 90;
      setIsCompleted(nowCompleted);

      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      schedulePersist(pct, elapsed, nowCompleted);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [user, clipId, containerRef, schedulePersist]);

  return { progress, isCompleted, timeSpentSeconds };
}
