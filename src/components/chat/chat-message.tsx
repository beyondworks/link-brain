'use client';

import { Bot, User, ExternalLink } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  clipReferences?: string[];
  createdAt?: string;
  isStreaming?: boolean;
  onClipClick?: (clipId: string) => void;
}

export function ChatMessage({
  role,
  content,
  clipReferences = [],
  createdAt,
  isStreaming,
  onClipClick,
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex gap-3 px-4 py-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
          isUser
            ? 'bg-primary/10 text-primary'
            : 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400'
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Content */}
      <div className={cn('flex max-w-[85%] flex-col gap-1.5', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-md'
              : 'bg-muted/60 text-foreground rounded-tl-md'
          )}
        >
          {content
            .split('\n')
            .map((line, i) => (
              <p key={i} className={line === '' ? 'h-2' : ''}>
                {line}
              </p>
            ))}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-current opacity-70" />
          )}
        </div>

        {/* Clip references */}
        {!isUser && clipReferences.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {clipReferences.slice(0, 5).map((clipId) => (
              <button
                key={clipId}
                type="button"
                onClick={() => onClipClick?.(clipId)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <ExternalLink size={10} />
                참조 클립
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {createdAt && (
          <span className="text-[10px] text-muted-foreground/50">
            {formatRelativeTime(new Date(createdAt))}
          </span>
        )}
      </div>
    </div>
  );
}
