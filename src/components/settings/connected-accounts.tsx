'use client';

/**
 * Connected Accounts — OAuth connection management UI for Settings page
 */

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOAuthConnections, useOAuthAuthorize, useOAuthDisconnect } from '@/lib/hooks/use-oauth-connections';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { AtSign, Unlink, ExternalLink } from 'lucide-react';
import type { OAuthProvider } from '@/types/database';

const PROVIDER_CONFIG: Record<
  OAuthProvider,
  { name: string; icon: string; color: string; gradientFrom: string; gradientTo: string; ring: string }
> = {
  threads: {
    name: 'Threads',
    icon: '@',
    color: 'text-foreground',
    gradientFrom: 'from-foreground/20',
    gradientTo: 'to-foreground/5',
    ring: 'ring-foreground/20',
  },
  youtube: {
    name: 'YouTube',
    icon: '▶',
    color: 'text-red-500',
    gradientFrom: 'from-red-500/20',
    gradientTo: 'to-red-500/5',
    ring: 'ring-red-500/20',
  },
};

// Only show providers that are currently supported
const ENABLED_PROVIDERS: OAuthProvider[] = ['threads'];

export function ConnectedAccounts() {
  const { data: connections, isLoading } = useOAuthConnections();
  const authorize = useOAuthAuthorize();
  const disconnect = useOAuthDisconnect();
  const searchParams = useSearchParams();

  // Handle OAuth callback result from URL params
  useEffect(() => {
    const oauthResult = searchParams.get('oauth');
    const provider = searchParams.get('provider');

    if (oauthResult === 'success' && provider) {
      toast.success(`${provider} 계정이 연결되었습니다`);
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth');
      url.searchParams.delete('provider');
      window.history.replaceState({}, '', url.toString());
    } else if (oauthResult === 'error') {
      const reason = searchParams.get('reason') ?? '알 수 없는 오류';
      toast.error(`계정 연결 실패: ${reason}`);
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth');
      url.searchParams.delete('reason');
      window.history.replaceState({}, '', url.toString());
    } else if (oauthResult === 'cancelled') {
      toast.info('계정 연결이 취소되었습니다');
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth');
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  const getConnection = (provider: OAuthProvider) =>
    connections?.find((c) => c.provider === provider);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        플랫폼 계정을 연결하면 이미지, 영상 등 미디어를 자동으로 가져옵니다.
      </p>

      {ENABLED_PROVIDERS.map((provider) => {
        const config = PROVIDER_CONFIG[provider];
        const conn = getConnection(provider);

        return (
          <div
            key={provider}
            className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3 transition-colors"
          >
            {/* Provider icon */}
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} ring-1 ${config.ring}`}
            >
              <span className={`text-sm font-bold ${config.color}`}>{config.icon}</span>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{config.name}</p>
              {conn ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AtSign size={10} />
                  <span>{conn.providerUsername ?? 'Connected'}</span>
                  <span className="mx-1">·</span>
                  <span suppressHydrationWarning>
                    {new Date(conn.connectedAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">연결되지 않음</p>
              )}
            </div>

            {/* Action */}
            {conn ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-spring"
                  >
                    <Unlink size={13} />
                    연결 해제
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{config.name} 연결 해제</AlertDialogTitle>
                    <AlertDialogDescription>
                      연결을 해제하면 {config.name}에서 미디어를 자동으로 가져올 수 없습니다.
                      이미 저장된 클립은 영향받지 않습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">취소</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => disconnect.mutate(provider)}
                      disabled={disconnect.isPending}
                    >
                      {disconnect.isPending ? '해제 중...' : '연결 해제'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-lg border-primary/40 text-xs text-primary transition-spring hover:bg-primary/10 hover:border-primary/60"
                onClick={() => authorize.mutate(provider)}
                disabled={authorize.isPending}
              >
                <ExternalLink size={13} />
                {authorize.isPending ? '연결 중...' : '연결'}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
