'use client';

import { Save, Loader2, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HistoryItem = {
  prompt: string;
  output: string;
  createdAt: Date;
};

type OutputPanelProps = {
  output: string;
  onOutputChange: (value: string) => void;
  onCopy: () => void;
  onReset: () => void;
  onSave: () => void;
  isSaving: boolean;
  isGenerating: boolean;
  contentTypeLabel: string;
  history: HistoryItem[];
  onHistorySelect: (item: HistoryItem) => void;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StudioOutputPanel({
  output,
  onOutputChange,
  onCopy,
  onReset,
  onSave,
  isSaving,
  isGenerating,
  contentTypeLabel,
  history,
  onHistorySelect,
}: OutputPanelProps) {
  return (
    <div className="space-y-4">
      {/* ── 결과 영역 ────────────────────────────────────────────── */}
      {output ? (
        <div className="card-glow card-inner-glow animate-blur-in animation-delay-100 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-4 py-3">
            <div className="icon-glow relative rounded-lg bg-primary/10 p-1.5">
              <Sparkles size={12} className="text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">생성 결과</span>
            <Badge
              variant="secondary"
              className="ml-1 rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
            >
              {contentTypeLabel}
            </Badge>
            {isGenerating && (
              <div className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            )}
          </div>
          <Textarea
            value={output}
            onChange={(e) => onOutputChange(e.target.value)}
            className="min-h-[280px] resize-none border-0 bg-transparent p-5 text-sm leading-relaxed focus-visible:ring-0"
            placeholder="생성된 콘텐츠가 여기에 표시됩니다..."
          />
          <div className="flex items-center justify-end gap-2 border-t border-border/60 px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs transition-spring hover:border-primary/30 hover:glow-brand-sm"
              onClick={onCopy}
            >
              복사
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs transition-spring hover:border-destructive/30"
              onClick={onReset}
            >
              초기화
            </Button>
            {!isGenerating && (
              <Button
                size="sm"
                className="rounded-xl text-xs bg-gradient-brand glow-brand-sm transition-spring"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={12} className="mr-1.5 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save size={12} className="mr-1.5" />
                    클립으로 저장
                  </>
                )}
              </Button>
            )}
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
              <button
                key={idx}
                onClick={() => onHistorySelect(item)}
                className={cn(
                  'w-full px-4 py-3 text-left transition-spring hover:bg-muted/30',
                  idx === 0 && 'rounded-b-none'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {item.prompt}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                      {item.output}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground/60">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
