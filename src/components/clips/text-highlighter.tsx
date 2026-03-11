'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Highlight } from '@/lib/hooks/use-highlights';

/* ─── 색상 설정 ────────────────────────────────────────────────────────── */
type HighlightColor = 'yellow' | 'green' | 'blue' | 'red';

const COLOR_CLASSES: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-200/50 border-b border-yellow-400/60',
  green: 'bg-green-200/50 border-b border-green-400/60',
  blue: 'bg-blue-200/50 border-b border-blue-400/60',
  red: 'bg-red-200/50 border-b border-red-400/60',
};

const COLOR_BUTTON_CLASSES: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-300 hover:bg-yellow-400',
  green: 'bg-green-300 hover:bg-green-400',
  blue: 'bg-blue-300 hover:bg-blue-400',
  red: 'bg-red-300 hover:bg-red-400',
};

const COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'red'];

/* ─── 툴바 위치 ────────────────────────────────────────────────────────── */
interface ToolbarPosition {
  top: number;
  left: number;
}

/* ─── 선택 상태 ────────────────────────────────────────────────────────── */
interface SelectionState {
  text: string;
  startOffset: number;
  endOffset: number;
  position: ToolbarPosition;
}

/* ─── 활성 하이라이트 상태 ───────────────────────────────────────────── */
interface ActiveHighlight {
  id: string;
  position: ToolbarPosition;
}

/* ─── Props ────────────────────────────────────────────────────────────── */
interface TextHighlighterProps {
  children: React.ReactNode;
  highlights: Highlight[];
  onCreateHighlight: (input: {
    text: string;
    startOffset: number;
    endOffset: number;
    color: HighlightColor;
  }) => void;
  onDeleteHighlight: (highlightId: string) => void;
  disabled?: boolean;
}

/* ─── 텍스트 오프셋 계산 ─────────────────────────────────────────────── */
/**
 * 컨테이너 내 텍스트 노드의 글로벌 오프셋을 계산합니다.
 */
function getTextOffset(container: Element, node: Node, offsetInNode: number): number {
  let offset = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const current = walker.currentNode;
    if (current === node) {
      return offset + offsetInNode;
    }
    offset += (current.textContent ?? '').length;
  }

  return offset + offsetInNode;
}

/**
 * 글로벌 오프셋에 해당하는 텍스트 노드와 로컬 오프셋을 찾습니다.
 */
function findNodeAtOffset(
  container: Element,
  targetOffset: number
): { node: Text; offset: number } | null {
  let accumulated = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const len = (node.textContent ?? '').length;
    if (accumulated + len >= targetOffset) {
      return { node, offset: targetOffset - accumulated };
    }
    accumulated += len;
  }

  return null;
}

/* ─── 하이라이트 오버레이 렌더링 ─────────────────────────────────────── */
/**
 * 저장된 하이라이트를 DOM에 시각적으로 오버레이합니다.
 * Range API를 사용해 정확한 위치에 mark 엘리먼트를 삽입합니다.
 */
function renderHighlights(
  container: Element,
  highlights: Highlight[],
  onHighlightClick: (id: string, pos: ToolbarPosition) => void
): (() => void) {
  const marks: HTMLElement[] = [];

  // start_offset 기준 역순 정렬 (DOM 수정 시 오프셋 충돌 방지)
  const sorted = [...highlights].sort((a, b) => b.start_offset - a.start_offset);

  for (const h of sorted) {
    const startPos = findNodeAtOffset(container, h.start_offset);
    const endPos = findNodeAtOffset(container, h.end_offset);

    if (!startPos || !endPos) continue;

    try {
      const range = document.createRange();
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);

      const mark = document.createElement('mark');
      mark.dataset.highlightId = h.id;
      mark.className = cn(
        'cursor-pointer rounded-[2px] transition-opacity hover:opacity-80',
        COLOR_CLASSES[(h.color as HighlightColor) ?? 'yellow']
      );

      mark.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = mark.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        onHighlightClick(h.id, {
          top: rect.bottom - containerRect.top + 8,
          left: rect.left - containerRect.left,
        });
      });

      range.surroundContents(mark);
      marks.push(mark);
    } catch {
      // range가 여러 블록에 걸치는 등 복잡한 경우 건너뜁니다
    }
  }

  // 정리 함수: mark 엘리먼트를 원래 텍스트 노드로 복원합니다
  return () => {
    for (const mark of marks) {
      if (!mark.parentNode) continue;
      const parent = mark.parentNode;
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize();
    }
  };
}

/* ─── 메인 컴포넌트 ────────────────────────────────────────────────────── */
export function TextHighlighter({
  children,
  highlights,
  onCreateHighlight,
  onDeleteHighlight,
  disabled = false,
}: TextHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<ActiveHighlight | null>(null);

  // 하이라이트를 DOM에 렌더링하고 클린업 함수를 반환합니다
  useEffect(() => {
    const container = containerRef.current;
    if (!container || highlights.length === 0) return;

    const cleanup = renderHighlights(container, highlights, (id, pos) => {
      setActiveHighlight({ id, position: pos });
      setSelection(null);
    });

    return cleanup;
  }, [highlights]);

  // 텍스트 선택 이벤트 처리
  const handleMouseUp = useCallback(() => {
    if (disabled) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // 선택 영역이 컨테이너 내부인지 확인
    if (!container.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    const startOffset = getTextOffset(container, range.startContainer, range.startOffset);
    const endOffset = getTextOffset(container, range.endContainer, range.endOffset);

    const containerRect = container.getBoundingClientRect();
    const rangeRect = range.getBoundingClientRect();

    setSelection({
      text,
      startOffset,
      endOffset,
      position: {
        top: rangeRect.bottom - containerRect.top + 8,
        left: Math.max(0, rangeRect.left - containerRect.left),
      },
    });
    setActiveHighlight(null);
  }, [disabled]);

  // 외부 클릭 시 툴바 닫기
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as Element;
      // 툴바 내부 클릭은 무시
      if (target.closest('[data-highlight-toolbar]')) return;
      setSelection(null);
      setActiveHighlight(null);
    };

    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  const handleCreateHighlight = useCallback(
    (color: HighlightColor) => {
      if (!selection) return;
      onCreateHighlight({
        text: selection.text,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
        color,
      });
      // 브라우저 선택 해제
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    },
    [selection, onCreateHighlight]
  );

  const handleDeleteHighlight = useCallback(() => {
    if (!activeHighlight) return;
    onDeleteHighlight(activeHighlight.id);
    setActiveHighlight(null);
  }, [activeHighlight, onDeleteHighlight]);

  return (
    <div ref={containerRef} className="relative" onMouseUp={handleMouseUp}>
      {children}

      {/* 선택 툴바: 색상 선택 */}
      {selection && (
        <div
          data-highlight-toolbar
          className="absolute z-[60] flex items-center gap-1 rounded-xl border border-border/60 bg-card px-2 py-1.5 shadow-elevated"
          style={{
            top: selection.position.top,
            left: selection.position.left,
          }}
        >
          <span className="mr-1 text-[10px] font-medium text-muted-foreground">하이라이트</span>
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`${color} 하이라이트`}
              className={cn(
                'h-5 w-5 rounded-full transition-transform hover:scale-110 active:scale-95',
                COLOR_BUTTON_CLASSES[color]
              )}
              onMouseDown={(e) => {
                e.preventDefault(); // 선택 해제 방지
                handleCreateHighlight(color);
              }}
            />
          ))}
        </div>
      )}

      {/* 활성 하이라이트 툴바: 삭제 */}
      {activeHighlight && (
        <div
          data-highlight-toolbar
          className="absolute z-[60] flex items-center gap-1 rounded-xl border border-border/60 bg-card px-2 py-1.5 shadow-elevated"
          style={{
            top: activeHighlight.position.top,
            left: activeHighlight.position.left,
          }}
        >
          <button
            type="button"
            aria-label="하이라이트 삭제"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            onClick={handleDeleteHighlight}
          >
            <Trash2 size={12} />
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
