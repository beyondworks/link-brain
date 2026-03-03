/**
 * useOAuthConnections — TanStack Query hook for OAuth connection management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { OAuthProvider } from '@/types/database';

interface OAuthConnectionView {
  provider: OAuthProvider;
  providerUsername: string | null;
  connectedAt: string;
}

/**
 * Fetch the list of connected OAuth accounts.
 */
export function useOAuthConnections() {
  return useQuery<OAuthConnectionView[]>({
    queryKey: ['oauth-connections'],
    queryFn: async () => {
      const res = await fetch('/api/v1/oauth/connections');
      if (!res.ok) throw new Error('Failed to fetch connections');
      const json = (await res.json()) as { success: boolean; data: OAuthConnectionView[] };
      if (!json.success) throw new Error('Failed to fetch connections');
      return json.data;
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Start the OAuth authorization flow.
 * Returns the auth URL to redirect the user to.
 */
export function useOAuthAuthorize() {
  return useMutation<string, Error, OAuthProvider>({
    mutationFn: async (provider) => {
      const res = await fetch(`/api/v1/oauth/authorize?provider=${provider}`);
      if (!res.ok) throw new Error('Failed to start OAuth flow');
      const json = (await res.json()) as {
        success: boolean;
        data: { authUrl: string };
        error?: { message: string };
      };
      if (!json.success) {
        throw new Error(json.error?.message ?? 'Failed to start OAuth flow');
      }
      return json.data.authUrl;
    },
    onSuccess: (authUrl) => {
      // Redirect to provider's authorization page
      window.location.href = authUrl;
    },
    onError: () => {
      toast.error('계정 연결을 시작할 수 없습니다');
    },
  });
}

/**
 * Disconnect an OAuth account.
 */
export function useOAuthDisconnect() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, OAuthProvider>({
    mutationFn: async (provider) => {
      const res = await fetch(`/api/v1/oauth/connections?provider=${provider}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to disconnect');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oauth-connections'] });
      toast.success('계정 연결이 해제되었습니다');
    },
    onError: () => {
      toast.error('계정 연결 해제에 실패했습니다');
    },
  });
}
