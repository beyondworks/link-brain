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

interface StreamMeta {
  conversationId: string;
  clipIds: string[];
  usedRag: boolean;
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

  return {
    sendMessage,
    abort,
    streamingContent,
    isStreaming,
    referencedClipIds,
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
