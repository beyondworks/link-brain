import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RetryClipInput {
  clipId: string;
}

/**
 * Mutation hook to retry processing a failed clip.
 * Calls the public /api/v1/clips/retry endpoint (authenticated via session).
 */
export function useRetryClip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RetryClipInput) => {
      const res = await fetch('/api/v1/clips/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipId: input.clipId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? body?.error ?? 'Retry failed');
      }

      return res.json();
    },
    onMutate: async (input) => {
      // Optimistic: set status back to 'processing'
      await queryClient.cancelQueries({ queryKey: ['clips'] });

      queryClient.setQueriesData<{ pages?: Array<{ data: Array<Record<string, unknown>> }> }>(
        { queryKey: ['clips'] },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((clip) =>
                clip.id === input.clipId
                  ? { ...clip, processing_status: 'processing', processing_error: null }
                  : clip
              ),
            })),
          };
        }
      );
    },
    onSuccess: () => {
      toast.success('재처리를 시작합니다.');
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
    onError: (err: Error) => {
      toast.error(`재시도 실패: ${err.message}`);
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
  });
}
