'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 inline-flex rounded-2xl bg-destructive/10 p-5">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">문제가 발생했습니다</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground/60">
          오류 코드: {error.digest}
        </p>
      )}
      <Button onClick={reset} className="mt-6 rounded-xl">
        다시 시도
      </Button>
    </div>
  );
}
