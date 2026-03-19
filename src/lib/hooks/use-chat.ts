'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  clip_references: string[];
  created_at: string;
}

export interface PendingAction {
  __type: 'pending_action';
  action: string;
  description: string;
  targetName: string | null;
  targetId: string | null;
  targetExists: boolean;
  clips: Array<{ id: string; title: string }>;
  clipCount: number;
}

interface StreamMeta {
  conversationId: string;
  clipIds: string[];
  usedRag: boolean;
  pendingAction?: PendingAction;
}

// ─── Conversations ──────────────────────────────────────────────────────────

export function useConversations() {
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/v1/conversations');
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const json = (await res.json()) as { data: { conversations: Conversation[] } };
      return json.data.conversations;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

// ─── Messages ───────────────────────────────────────────────────────────────

export function useChatMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await fetch(`/api/v1/conversations/${conversationId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const json = (await res.json()) as { data: { messages: Message[] } };
      return json.data.messages;
    },
    enabled: !!conversationId,
    staleTime: 10_000,
  });
}

// ─── Send Message (Streaming) ───────────────────────────────────────────────

export function useSendMessage() {
  const queryClient = useQueryClient();
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [referencedClipIds, setReferencedClipIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async ({
      message,
      conversationId,
      language = 'ko',
    }: {
      message: string;
      conversationId?: string | null;
      language?: 'ko' | 'en';
    }): Promise<{ conversationId: string; clipIds: string[] } | null> => {
      setIsStreaming(true);
      setStreamingContent('');
      setReferencedClipIds([]);
      setPendingAction(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/v1/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ask',
            message,
            conversationId: conversationId ?? undefined,
            language,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errJson = (await res.json()) as { error?: { message?: string } };
          throw new Error(errJson.error?.message ?? `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let buffer = '';
        let meta: StreamMeta | null = null;
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE metadata from first chunk
          if (!meta && buffer.startsWith('data: ')) {
            const newlineIdx = buffer.indexOf('\n\n');
            if (newlineIdx !== -1) {
              const dataLine = buffer.substring(6, newlineIdx);
              try {
                meta = JSON.parse(dataLine) as StreamMeta;
                setReferencedClipIds(meta.clipIds);
                if (meta.pendingAction) {
                  setPendingAction(meta.pendingAction);
                }
              } catch {
                // Not JSON metadata, treat as content
                fullContent += buffer.substring(0, newlineIdx);
                setStreamingContent(fullContent);
              }
              buffer = buffer.substring(newlineIdx + 2);
            }
          }

          if (buffer && meta) {
            fullContent += buffer;
            setStreamingContent(fullContent);
            buffer = '';
          } else if (!meta) {
            // No metadata yet, accumulate
            fullContent += buffer;
            setStreamingContent(fullContent);
            buffer = '';
          }
        }

        // Invalidate caches
        if (meta?.conversationId) {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['chat-messages', meta.conversationId] });
        }
        queryClient.invalidateQueries({ queryKey: ['credits'] });

        return meta ? { conversationId: meta.conversationId, clipIds: meta.clipIds } : null;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return null;
        throw err;
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [queryClient]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const confirmAction = useCallback(
    async (action: PendingAction, conversationId: string | null): Promise<{ success: boolean; message: string }> => {
      setIsConfirming(true);
      try {
        const res = await fetch('/api/v1/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'confirm',
            pendingAction: action,
            conversationId,
          }),
        });

        const json = (await res.json()) as {
          success: boolean;
          message?: string;
          error?: string;
          invalidate?: string[];
        };

        if (json.success && json.invalidate) {
          for (const key of json.invalidate) {
            queryClient.invalidateQueries({ queryKey: [key] });
          }
          queryClient.invalidateQueries({ queryKey: ['credits'] });
          if (conversationId) {
            queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
          }
        }

        setPendingAction(null);
        return { success: json.success, message: json.message ?? json.error ?? '' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { success: false, message: msg };
      } finally {
        setIsConfirming(false);
      }
    },
    [queryClient]
  );

  const dismissAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  return {
    sendMessage,
    abort,
    streamingContent,
    isStreaming,
    referencedClipIds,
    pendingAction,
    isConfirming,
    confirmAction,
    dismissAction,
  };
}

// ─── Delete Conversation ────────────────────────────────────────────────────

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await fetch(`/api/v1/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete conversation');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
