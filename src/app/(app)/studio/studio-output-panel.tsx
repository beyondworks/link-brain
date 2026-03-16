'use client';

import { useState } from 'react';
import { Save, Loader2, Sparkles, Clock, Trash2, Copy, ChevronDown, X, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HistoryItem = {
  id?: string;
  prompt: string;
  output: string;
  createdAt: Date;
};

type OutputPanelProps = {
  output: string;
  onCopy: () => void;
  onReset: () => void;
  onSave: () => void;
  isSaving: boolean;
  isGenerating: boolean;
  contentTypeLabel: string;
  history: HistoryItem[];
  onHistoryDelete?: (item: HistoryItem) => void;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

// ─── History Item (Collapsible) ──────────────────────────────────────────────

function HistoryItemRow({ item, onDelete, onOpenModal }: {
  item: HistoryItem;
  onDelete?: (item: HistoryItem) => void;
  onOpenModal: (item: HistoryItem) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            {item.prompt}
          </p>
          {!isExpanded && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {item.output}
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
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 animate-fade-in">
          <div className="max-h-[160px] overflow-y-auto rounded-xl bg-muted/30 p-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
            {item.output}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void navigator.clipboard.writeText(item.output);
                toast.success('복사되었습니다');
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground transition-spring hover:bg-accent hover:text-foreground"
            >
              <Copy size={10} />
              복사
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

function OutputModal({ item, onClose, onCopy }: {
  item: HistoryItem;
  onClose: () => void;
  onCopy: () => void;
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
            <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {item.output}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              onClick={onCopy}
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

// ─── Component ────────────────────────────────────────────────────────────────

export function StudioOutputPanel({
  output,
  onCopy,
  onReset,
  onSave,
  isSaving,
  isGenerating,
  contentTypeLabel,
  history,
  onHistoryDelete,
}: OutputPanelProps) {
  const [modalItem, setModalItem] = useState<HistoryItem | null>(null);

  return (
    <div className="space-y-4">
      {/* ── 생성 결과 (간결한 알림 바) ─────────────────────────────── */}
      {output ? (
        <div className="card-glow animate-blur-in overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Sparkles size={14} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">생성 완료</p>
              <p className="truncate text-xs text-muted-foreground">
                {contentTypeLabel} · {output.length.toLocaleString()}자
              </p>
            </div>
            {isGenerating && (
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            )}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs"
                onClick={() => {
                  setModalItem({ prompt: contentTypeLabel, output, createdAt: new Date() });
                }}
              >
                <Maximize2 size={12} className="mr-1" />
                보기
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs"
                onClick={onCopy}
              >
                <Copy size={12} className="mr-1" />
                복사
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs"
                onClick={onReset}
              >
                초기화
              </Button>
              {!isGenerating && (
                <Button
                  size="sm"
                  className="h-8 rounded-xl text-xs bg-gradient-brand glow-brand-sm"
                  onClick={onSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 size={12} className="mr-1 animate-spin" />
                  ) : (
                    <Save size={12} className="mr-1" />
                  )}
                  {isSaving ? '저장 중' : '클립으로 저장'}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in-up animation-delay-400 relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-muted/10 p-12 text-center">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative mx-auto mb-4 w-fit rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 p-5 ring-1 ring-primary/15">
            <Sparkles size={28} className="animate-float text-primary" />
          </div>
          <p className="relative text-base font-semibold text-foreground">
            콘텐츠가 여기에 표시됩니다
          </p>
          <p className="relative mt-1.5 text-sm text-muted-foreground">
            유형과 클립을 선택한 후 AI로 생성 버튼을 누르세요
          </p>
        </div>
      )}

      {/* ── 이전 생성 기록 ───────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="animate-fade-in-up rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <Clock size={14} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">이전 생성</span>
            <Badge
              variant="secondary"
              className="ml-1 rounded-lg px-2 py-0.5 text-[10px]"
            >
              {history.length}
            </Badge>
          </div>
          <div className="divide-y divide-border/40">
            {history.map((item, idx) => (
              <HistoryItemRow
                key={idx}
                item={item}
                onDelete={onHistoryDelete}
                onOpenModal={setModalItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── 전체 보기 모달 ──────────────────────────────────────── */}
      {modalItem && (
        <OutputModal
          item={modalItem}
          onClose={() => setModalItem(null)}
          onCopy={() => {
            void navigator.clipboard.writeText(modalItem.output);
            toast.success('복사되었습니다');
          }}
        />
      )}
    </div>
  );
}
