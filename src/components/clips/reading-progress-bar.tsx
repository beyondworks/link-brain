'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useReadingProgress } from '@/lib/hooks/use-reading-progress';

interface ReadingProgressBarProps {
  clipId: string;
  userId: string;
}

export function ReadingProgressBar({ clipId, userId: _userId }: ReadingProgressBarProps) {
  const [scrollPct, setScrollPct] = useState(0);
  const { progress, update } = useReadingProgress(clipId);
  const startTimeRef = useRef<number>(Date.now());
  const lastSavedPctRef = useRef<number>(0);

  // 마운트 시 저장된 진행률 반영
  useEffect(() => {
    if (progress && progress.scroll_percentage > 0) {
      setScrollPct(progress.scroll_percentage);
      lastSavedPctRef.current = progress.scroll_percentage;
    }
  }, [progress]);

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (docHeight <= 0) return;

    const pct = Math.min(100, Math.round((scrollTop / docHeight) * 100));
    setScrollPct(pct);

    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

    // 변화가 있을 때만 디바운스 저장
    if (pct !== lastSavedPctRef.current) {
      lastSavedPctRef.current = pct;
      update({ scroll_percentage: pct, time_spent_seconds: timeSpent });
    }
  }, [update]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return (
    <div
      className={cn(
        'fixed left-0 top-0 z-50 h-0.5 bg-primary transition-all duration-150 ease-out'
      )}
      style={{ width: `${scrollPct}%` }}
      role="progressbar"
      aria-valuenow={scrollPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`읽기 진행률 ${scrollPct}%`}
    />
  );
}
