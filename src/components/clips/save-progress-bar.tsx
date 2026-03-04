'use client';

import { useEffect, useRef } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export function SaveProgressBar() {
  const pendingSaveCount = useUIStore((s) => s.pendingSaveCount);
  const completedSaveCount = useUIStore((s) => s.completedSaveCount);
  const resetSaveProgress = useUIStore((s) => s.resetSaveProgress);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = pendingSaveCount + completedSaveCount;
  const isActive = pendingSaveCount > 0;
  const isDone = !isActive && completedSaveCount > 0;

  // Auto-hide after completion
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isDone) {
      timerRef.current = setTimeout(() => {
        resetSaveProgress();
      }, 3000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDone, resetSaveProgress]);

  if (!isActive && !isDone) return null;

  const progress = total > 0 ? (completedSaveCount / total) * 100 : 0;

  return (
    <div
      className={cn(
        'sticky top-0 z-[var(--z-sticky)] mb-4 overflow-hidden rounded-xl border bg-card shadow-card transition-all duration-300',
        isActive ? 'border-primary/30' : 'border-emerald-500/30',
      )}
    >
      {/* Progress bar track */}
      <div className="h-1 w-full bg-muted/50">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            isActive ? 'bg-primary' : 'bg-emerald-500',
          )}
          style={{ width: `${isDone ? 100 : progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5">
        {isActive ? (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">
              {total === 1
                ? '클립 저장 및 분석 중...'
                : `클립 저장 및 분석 중... (${completedSaveCount}/${total})`}
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="text-sm font-medium text-foreground">
              {completedSaveCount === 1
                ? '클립이 저장되었습니다'
                : `${completedSaveCount}개 클립이 저장되었습니다`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
