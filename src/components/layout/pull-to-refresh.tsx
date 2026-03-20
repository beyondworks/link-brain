'use client';

import { useRef, useCallback } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const THRESHOLD = 80;

interface PullToRefreshWrapperProps {
  children: React.ReactNode;
  stickyHeader?: React.ReactNode;
  className?: string;
}

export function PullToRefreshWrapper({ children, stickyHeader, className }: PullToRefreshWrapperProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLElement | null>(null);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['clips'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['nav-counts'] }),
    ]);
  }, [queryClient]);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
    isEnabled: isMobile,
    containerRef,
  });

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = pullDistance > 0 || isRefreshing;

  return (
    <main
      ref={containerRef}
      id="main-content"
      aria-label="메인 콘텐츠"
      className={cn(
        'relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain',
        'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0',
        className,
      )}
    >
      {/* Sticky header — inside scroll container, no padding needed */}
      {stickyHeader}

      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-sticky flex items-center justify-center"
          style={{ height: `${pullDistance}px` }}
          aria-live="polite"
          aria-label={isRefreshing ? '새로고침 중' : '당겨서 새로고침'}
        >
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full bg-background shadow-lg border border-border/60 transition-transform duration-200',
              isRefreshing && 'animate-pulse',
            )}
            style={{
              transform: `scale(${0.5 + progress * 0.5})`,
              opacity: Math.min(progress * 1.5, 1),
            }}
          >
            {isRefreshing ? (
              <Loader2 size={18} className="animate-spin text-primary" />
            ) : (
              <ArrowDown
                size={18}
                className={cn(
                  'text-muted-foreground transition-all duration-200',
                  progress >= 1 && 'text-primary',
                )}
                style={{
                  transform: `rotate(${progress >= 1 ? 180 : 0}deg)`,
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Content with pull offset */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 && !isRefreshing
            ? 'transform 0.35s cubic-bezier(0.25, 1.3, 0.5, 1)'
            : 'none',
        }}
      >
        {children}
      </div>
    </main>
  );
}
