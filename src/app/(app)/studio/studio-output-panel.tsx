'use client';

import { useState } from 'react';
import { Save, Loader2, Sparkles, Clock, Copy, Maximize2, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarkdownContent } from '@/components/clips/markdown-content';
import {
  HistoryItemRow,
  OutputModal,
  copyMarkdown,
  copyPlain,
  type HistoryItem,
} from './studio-output-history';

export type { HistoryItem } from './studio-output-history';

type OutputPanelProps = {
  output: string;
  onReset: () => void;
  onSave: () => void;
  isSaving: boolean;
  isGenerating: boolean;
  contentTypeLabel: string;
  history: HistoryItem[];
  onHistoryDelete?: (item: HistoryItem) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function StudioOutputPanel({
  output,
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
      {/* ── 생성 결과 ───────────────────────────────────────────────── */}
      {output ? (
        <div className="card-glow animate-blur-in overflow-hidden rounded-2xl border border-primary/20 bg-card">
          {/* 액션 바 */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="shrink-0 rounded-lg bg-primary/10 p-1.5">
                <Sparkles size={14} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="whitespace-nowrap text-sm font-semibold text-foreground">
                  {isGenerating ? '생성 중' : '생성 완료'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {contentTypeLabel} · {output.length.toLocaleString()}자
                </p>
              </div>
              {isGenerating && (
                <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs"
                onClick={() =>
                  setModalItem({ prompt: contentTypeLabel, output, createdAt: new Date() })
                }
              >
                <Maximize2 size={12} className="mr-1" />
                전체 보기
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs"
                onClick={() => copyMarkdown(output)}
              >
                <Copy size={12} className="mr-1" />
                복사
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs"
                onClick={() => copyPlain(output)}
              >
                <Type size={12} className="mr-1" />
                서식 없이 복사
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
                  className="bg-gradient-brand glow-brand-sm h-8 min-w-[5rem] rounded-xl text-xs"
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

          {/* 본문 — 스트리밍 중엔 원문, 완료되면 마크다운 렌더 */}
          <div className="max-h-[520px] overflow-y-auto px-5 py-4">
            {isGenerating ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/80">
                {output}
              </pre>
            ) : (
              <MarkdownContent content={output} />
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
              <HistoryItemRow
                key={item.id ?? idx}
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
        <OutputModal item={modalItem} onClose={() => setModalItem(null)} />
      )}
    </div>
  );
}
