'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorRetryProps {
  error?: Error | null;
  onRetry: () => void;
  message?: string;
  autoRetrySeconds?: number;
  className?: string;
}

export function ErrorRetry({
  error,
  onRetry,
  message = '데이터를 불러오는 중 오류가 발생했습니다',
  autoRetrySeconds,
  className,
}: ErrorRetryProps) {
  const [countdown, setCountdown] = useState(autoRetrySeconds ?? 0);

  useEffect(() => {
    if (!autoRetrySeconds || autoRetrySeconds <= 0) return;

    setCountdown(autoRetrySeconds);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onRetry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  // onRetry를 deps에서 제외 — 매 렌더마다 재설정 방지
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRetrySeconds]);

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div
      className={cn(
        'flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center',
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>

      <div className="space-y-1.5">
        <p className="text-base font-semibold text-foreground">{message}</p>
        {errorMessage && (
          <p className="max-w-xs text-sm text-muted-foreground">{errorMessage}</p>
        )}
      </div>

      <Button onClick={onRetry} variant="outline" className="rounded-xl">
        {autoRetrySeconds && countdown > 0
          ? `다시 시도 (${countdown}초)`
          : '다시 시도'}
      </Button>
    </div>
  );
}
