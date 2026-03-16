'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  X,
  Plus,
  ChevronLeft,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useUIStore } from '@/stores/ui-store';
import { useConversations, useChatMessages, useSendMessage, useDeleteConversation } from '@/lib/hooks/use-chat';
import { ChatMessage } from '@/components/chat/chat-message';
import { ChatInput } from '@/components/chat/chat-input';
import { cn, formatRelativeTime } from '@/lib/utils';

export function ChatPanel() {
  const isChatOpen = useUIStore((s) => s.isChatOpen);
  const closeChat = useUIStore((s) => s.closeChat);
  const openClipPeek = useUIStore((s) => s.openClipPeek);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: convLoading } = useConversations();
  const { data: messages, isLoading: msgLoading } = useChatMessages(activeConversationId);
  const { sendMessage, abort, streamingContent, isStreaming, referencedClipIds } = useSendMessage();
  const deleteConversation = useDeleteConversation();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Reset view when panel closes
  useEffect(() => {
    if (!isChatOpen) {
      setView('list');
      setActiveConversationId(null);
    }
  }, [isChatOpen]);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setView('chat');
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setView('chat');
  }, []);

  const handleSend = useCallback(
    async (message: string) => {
      const result = await sendMessage({
        message,
        conversationId: activeConversationId,
      });
      if (result?.conversationId && !activeConversationId) {
        setActiveConversationId(result.conversationId);
      }
    },
    [sendMessage, activeConversationId]
  );

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteConversation.mutate(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setView('list');
      }
    },
    [deleteConversation, activeConversationId]
  );

  const handleClipClick = useCallback(
    (clipId: string) => {
      openClipPeek(clipId);
    },
    [openClipPeek]
  );

  if (!isChatOpen) return null;

  return (
    <>
      {/* Overlay (mobile) */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[49] bg-black/30 lg:hidden animate-fade-in"
        style={{ top: 'var(--sat, env(safe-area-inset-top, 0px))' }}
        onClick={closeChat}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={cn(
          'fixed right-0 top-0 z-[50] flex h-full flex-col',
          'w-full sm:w-96 lg:w-[420px]',
          'border-l border-border/50 bg-background shadow-2xl',
          'animate-slide-in',
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border/50 px-4">
          <div className="flex items-center gap-2">
            {view === 'chat' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setView('list');
                  setActiveConversationId(null);
                }}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft size={16} />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 p-1.5">
                <Sparkles size={14} className="text-primary" />
              </div>
              <span className="text-sm font-semibold">
                {view === 'list' ? 'AI 채팅' : '대화'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {view === 'list' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewChat}
                className="h-8 w-8 rounded-lg"
                aria-label="새 대화"
              >
                <Plus size={16} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={closeChat}
              className="h-8 w-8 rounded-lg"
              aria-label="채팅 닫기"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Body */}
        {view === 'list' ? (
          /* ─── Conversation List ─── */
          <div className="min-h-0 flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="rounded-2xl bg-primary/10 p-4">
                  <MessageSquare size={24} className="text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">아직 대화가 없습니다</p>
                <p className="text-xs text-muted-foreground">
                  저장된 클립을 기반으로 AI에게 질문해 보세요
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewChat}
                  className="mt-2 rounded-xl"
                >
                  <Plus size={14} className="mr-1.5" />
                  새 대화 시작
                </Button>
              </div>
            ) : (
              <ul className="space-y-1 p-2">
                {conversations.map((conv) => (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conv.id)}
                      className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/60"
                    >
                      <MessageSquare size={16} className="shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {conv.title || '새 대화'}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60">
                          {formatRelativeTime(new Date(conv.updated_at))}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(conv.id, e)}
                        className="hidden shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:block"
                        aria-label="대화 삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          /* ─── Chat View ─── */
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {msgLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-xl" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Empty state for new conversation */}
                  {(!messages || messages.length === 0) && !streamingContent && (
                    <div className="flex flex-col items-center justify-center gap-3 p-8 pt-20 text-center">
                      <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-4">
                        <Sparkles size={24} className="text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        무엇이든 물어보세요
                      </p>
                      <p className="max-w-[240px] text-xs text-muted-foreground leading-relaxed">
                        저장된 클립을 자동으로 검색하여 관련 정보를 기반으로 답변합니다
                      </p>
                    </div>
                  )}

                  {/* Messages */}
                  {messages?.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      role={msg.role}
                      content={msg.content}
                      clipReferences={msg.clip_references}
                      createdAt={msg.created_at}
                      onClipClick={handleClipClick}
                    />
                  ))}

                  {/* Streaming assistant message or loading indicator */}
                  {isStreaming && (
                    streamingContent ? (
                      <ChatMessage
                        role="assistant"
                        content={streamingContent}
                        clipReferences={referencedClipIds}
                        isStreaming
                        onClipClick={handleClipClick}
                      />
                    ) : (
                      <div className="flex gap-3 px-4 py-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                          <Sparkles size={14} className="animate-pulse text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-muted/60 px-3.5 py-2.5">
                          <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '0ms' }} />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '150ms' }} />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-xs text-muted-foreground">클립을 검색하고 있습니다...</span>
                        </div>
                      </div>
                    )
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              onStop={abort}
              isStreaming={isStreaming}
            />
          </>
        )}
      </aside>
    </>
  );
}
