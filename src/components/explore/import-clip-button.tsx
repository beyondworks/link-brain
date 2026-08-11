'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookmarkPlus, Check, Loader2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useSupabase } from '@/components/providers/supabase-provider';
import type { VariantProps } from 'class-variance-authority';

interface ImportErrorBody {
  error?: { code?: string; message?: string };
}

interface ImportClipButtonProps {
  clipId: string;
  size?: VariantProps<typeof buttonVariants>['size'];
  variant?: VariantProps<typeof buttonVariants>['variant'];
  className?: string;
  /** 카드처럼 링크 안에 놓일 때 클릭 전파를 막는다 */
  stopPropagation?: boolean;
  /** 비로그인 방문자에게 대신 보여줄 요소 (기본: 아무것도 렌더링하지 않음) */
  signedOutFallback?: React.ReactNode;
}

/**
 * 탐색에서 발견한 공개 클립을 내 클립으로 복사하는 버튼.
 * 로그인하지 않은 방문자에게는 렌더링하지 않는다 (임포트는 인증 필요).
 */
export function ImportClipButton({
  clipId,
  size = 'sm',
  variant = 'outline',
  className,
  stopPropagation = false,
  signedOutFallback = null,
}: ImportClipButtonProps) {
  const { user, isLoading } = useSupabase();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const importClip = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/explore/${clipId}/import`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ImportErrorBody;
        if (res.status === 409) {
          const err = new Error('이미 저장된 URL입니다.');
          err.name = 'DuplicateUrlError';
          throw err;
        }
        throw new Error(body.error?.message ?? '클립을 저장하지 못했습니다.');
      }
    },
    onSuccess: () => {
      setSaved(true);
      toast.success('내 클립에 저장했습니다.');
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      queryClient.invalidateQueries({ queryKey: ['nav-counts'] });
    },
    onError: (err: Error) => {
      if (err.name === 'DuplicateUrlError') {
        setSaved(true);
        toast.warning('이미 저장된 URL입니다.');
        return;
      }
      toast.error(err.message);
    },
  });

  if (isLoading) return null;
  if (!user) return <>{signedOutFallback}</>;

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      disabled={importClip.isPending || saved}
      onClick={(e) => {
        if (stopPropagation) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (!saved) importClip.mutate();
      }}
    >
      {importClip.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : saved ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <BookmarkPlus className="h-3.5 w-3.5" />
      )}
      {saved ? '저장됨' : '내 클립에 저장'}
    </Button>
  );
}
