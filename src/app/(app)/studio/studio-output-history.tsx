'use client';

import { useState } from 'react';
import { Trash2, Copy, ChevronDown, X, Maximize2, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MarkdownContent } from '@/components/clips/markdown-content';
import { stripMarkdown } from '@/lib/utils/strip-markdown';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HistoryItem = {
  id?: string;
  prompt: string;
  output: string;
  createdAt: Date;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatRelativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export function copyMarkdown(text: string) {
  void navigator.clipboard.writeText(text);
  toast.success('마크다운 그대로 복사했습니다.');
}

export function copyPlain(text: string) {
  void navigator.clipboard.writeText(stripMarkdown(text));
  toast.success('서식 없이 복사했습니다. SNS에 그대로 붙여넣으세요.');
}

// ─── History Item (Collapsible) ──────────────────────────────────────────────

export function HistoryItemRow({ item, onDelete, onOpenModal }: {
  item: HistoryItem;
  onDelete?: (item: HistoryItem) => void;
  onOpenModal: (item: HistoryItem) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-border/30 last:border-b-0">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded); } }}
        className="flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            {item.prompt}
          </p>
          {!isExpanded && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {stripMarkdown(item.output)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground/60" suppressHydrationWarning>
            {formatRelativeTime(item.createdAt)}
          </span>
          <ChevronDown
            size={12}
            className={cn(
              'text-muted-foreground/40 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
          {onDelete && item.id && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(item); }}
              className="rounded-md p-1 text-muted-foreground/40 transition-spring hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-3 animate-fade-in">
          <div className="max-h-[220px] overflow-y-auto rounded-xl bg-muted/30 p-3">
            <MarkdownContent content={item.output} />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); copyMarkdown(item.output); }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground transition-spring hover:bg-accent hover:text-foreground"
            >
              <Copy size={10} />
              복사
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); copyPlain(item.output); }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground transition-spring hover:bg-accent hover:text-foreground"
            >
              <Type size={10} />
              서식 없이 복사
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenModal(item); }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground transition-spring hover:bg-accent hover:text-foreground"
            >
              <Maximize2 size={10} />
              전체 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Full View Modal ─────────────────────────────────────────────────────────

export function OutputModal({ item, onClose }: {
  item: HistoryItem;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-[50] bg-black/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-4 z-[50] flex items-center justify-center sm:inset-8 lg:inset-16">
        <div className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{item.prompt}</p>
              <p className="text-[11px] text-muted-foreground" suppressHydrationWarning>
                {formatRelativeTime(item.createdAt)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 shrink-0 rounded-lg"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <MarkdownContent content={item.output} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => copyPlain(item.output)}
            >
              <Type size={12} className="mr-1.5" />
              서식 없이 복사
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => copyMarkdown(item.output)}
            >
              <Copy size={12} className="mr-1.5" />
              복사
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
