'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Check, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buildCollectionShareUrl } from '@/lib/utils/share';

interface ShareResponse {
  success: boolean;
  data: {
    token: string;
    shareUrl: string;
  };
}

interface UnshareResponse {
  success: boolean;
  data: {
    collectionId: string;
    shared: boolean;
  };
}

interface Props {
  collectionId: string;
  /** 현재 컬렉션에 저장된 share_token (없으면 undefined) */
  initialShareToken?: string | null;
  className?: string;
}

function useShareCollection(collectionId: string) {
  const queryClient = useQueryClient();

  const shareMutation = useMutation({
    mutationFn: async (): Promise<ShareResponse> => {
      const res = await fetch(`/api/v1/collections/${collectionId}/share`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('공유 토큰 생성에 실패했습니다.');
      return res.json() as Promise<ShareResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: () => {
      toast.error('공유 링크 생성에 실패했습니다.');
    },
  });

  const unshareMutation = useMutation({
    mutationFn: async (): Promise<UnshareResponse> => {
      const res = await fetch(`/api/v1/collections/${collectionId}/share`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('공유 해제에 실패했습니다.');
      return res.json() as Promise<UnshareResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: () => {
      toast.error('공유 해제에 실패했습니다.');
    },
  });

  return { shareMutation, unshareMutation };
}

export function CollectionShareButton({
  collectionId,
  initialShareToken,
  className,
}: Props) {
  const [shareToken, setShareToken] = useState<string | null>(initialShareToken ?? null);
  const [copied, setCopied] = useState(false);

  const { shareMutation, unshareMutation } = useShareCollection(collectionId);

  const isShared = shareToken !== null;
  const shareUrl = shareToken ? buildCollectionShareUrl(shareToken) : '';
  const isPending = shareMutation.isPending || unshareMutation.isPending;

  async function handleToggle(checked: boolean) {
    if (checked) {
      const result = await shareMutation.mutateAsync().catch(() => null);
      if (result?.data?.token) {
        setShareToken(result.data.token);
        toast.success('공유 링크가 생성되었습니다.');
      }
    } else {
      await unshareMutation.mutateAsync().catch(() => null);
      setShareToken(null);
      toast.success('공유가 해제되었습니다.');
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('링크가 복사되었습니다.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Toggle row */}
      <div className="flex items-center gap-2.5">
        <Switch
          id={`share-toggle-${collectionId}`}
          checked={isShared}
          onCheckedChange={handleToggle}
          disabled={isPending}
          aria-label="컬렉션 공유 토글"
        />
        <Label
          htmlFor={`share-toggle-${collectionId}`}
          className="cursor-pointer select-none text-sm text-foreground"
        >
          {isShared ? '공유 중' : '공유'}
        </Label>
        {isPending && (
          <span className="text-xs text-muted-foreground animate-pulse">처리 중...</span>
        )}
      </div>

      {/* Share URL row */}
      {isShared && shareUrl && (
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
          <LinkIcon size={13} className="flex-shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {shareUrl}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 flex-shrink-0 rounded-lg p-0 hover:bg-background"
            onClick={handleCopy}
            aria-label="링크 복사"
          >
            {copied ? (
              <Check size={13} className="text-primary" />
            ) : (
              <Copy size={13} className="text-muted-foreground" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
