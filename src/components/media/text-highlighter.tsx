'use client';

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useAnnotations, useCreateAnnotation, useDeleteAnnotation } from '@/hooks/mutations/use-annotations';
// Annotation type defined locally below

// ─── 타입 ──────────────────────────────────────────────────────────────────────

interface Annotation {
  id: string;
  clip_id: string;
  user_id: string;
  type: 'highlight' | 'note' | 'bookmark';
  selected_text: string | null;
  note_text: string | null;
  position_data: {
    startOffset: number;
    endOffset: number;
    startPath: string;
    endPath: string;
  } | null;
  color: string;
  created_at: string;
}

interface TextHighlighterProps {
  clipId: string;
  children: ReactNode;
}

interface ToolbarPosition {
  x: number;
  y: number;
}

// ─── 색상 설정 ────────────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = [
  { id: 'yellow', label: '노란색', bg: 'bg-yellow-200', mark: '#fef08a', text: 'text-yellow-900' },
  { id: 'green', label: '초록색', bg: 'bg-green-200', mark: '#bbf7d0', text: 'text-green-900' },
  { id: 'blue', label: '파란색', bg: 'bg-blue-200', mark: '#bfdbfe', text: 'text-blue-900' },
  { id: 'pink', label: '분홍색', bg: 'bg-pink-200', mark: '#fbcfe8', text: 'text-pink-900' },
  { id: 'purple', label: '보라색', bg: 'bg-purple-200', mark: '#e9d5ff', text: 'text-purple-900' },
] as const;

type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]['id'];

function getMarkColor(color: string): string {
  const found = HIGHLIGHT_COLORS.find((c) => c.id === color);
  return found?.mark ?? '#fef08a';
}

// ─── 텍스트 경로 유틸 ─────────────────────────────────────────────────────────

function getNodePath(node: Node, root: Node): string {
  const path: number[] = [];
  let current: Node | null = node;
  while (current && current !== root) {
    const parent: Node | null = current.parentNode;
    if (!parent) break;
    const index = Array.from(parent.childNodes).indexOf(current as ChildNode);
    path.unshift(index);
    current = parent;
  }
  return path.join('/');
}

function getNodeByPath(path: string, root: Node): Node | null {
  const parts = path.split('/').map(Number);
  let current: Node = root;
  for (const index of parts) {
    const child = current.childNodes[index];
    if (!child) return null;
    current = child;
  }
  return current;
}

// ─── 하이라이트 렌더링 ────────────────────────────────────────────────────────

function applyHighlights(container: HTMLElement, annotations: Annotation[]) {
  // 기존 mark 태그 제거 (data-annotation-id 있는 것만)
  const existing = container.querySelectorAll('mark[data-annotation-id]');
  existing.forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });

  // position_data가 있는 highlight 타입만 렌더링
  const highlights = annotations.filter(
    (a) => a.type === 'highlight' && a.position_data
  );

  for (const annotation of highlights) {
    const pd = annotation.position_data;
    if (!pd) continue;

    try {
      const startNode = getNodeByPath(pd.startPath, container);
      const endNode = getNodeByPath(pd.endPath, container);
      if (!startNode || !endNode) continue;

      const range = document.createRange();
      range.setStart(startNode, pd.startOffset);
      range.setEnd(endNode, pd.endOffset);

      const mark = document.createElement('mark');
      mark.dataset.annotationId = annotation.id;
      mark.style.backgroundColor = getMarkColor(annotation.color);
      mark.style.borderRadius = '2px';
      mark.style.cursor = 'pointer';
      mark.title = annotation.note_text ?? '';

      range.surroundContents(mark);
    } catch {
      // DOM 변경으로 range가 유효하지 않을 수 있음 — 무시
    }
  }
}

// ─── 플로팅 툴바 ──────────────────────────────────────────────────────────────

interface FloatingToolbarProps {
  position: ToolbarPosition;
  selectedText: string;
  onHighlight: (color: HighlightColor, noteText?: string) => void;
  onClose: () => void;
}

function FloatingToolbar({ position, selectedText, onHighlight, onClose }: FloatingToolbarProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  const handleColorClick = (color: HighlightColor) => {
    onHighlight(color);
    onClose();
  };

  const handleNoteSubmit = (color: HighlightColor) => {
    onHighlight(color, noteText);
    setNoteOpen(false);
    setNoteText('');
    onClose();
  };

  if (!selectedText) return null;

  return (
    <div
      className="fixed z-50 flex items-center gap-1 rounded-lg border bg-popover p-1.5 shadow-lg"
      style={{ left: position.x, top: position.y, transform: 'translateX(-50%)' }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.id}
          title={c.label}
          className={cn(
            'h-5 w-5 rounded-full border border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring',
            c.bg
          )}
          onClick={() => handleColorClick(c.id as HighlightColor)}
        />
      ))}

      <div className="mx-1 h-4 w-px bg-border" />

      <Popover open={noteOpen} onOpenChange={setNoteOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            메모
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" side="bottom" align="center">
          <p className="mb-2 text-xs text-muted-foreground line-clamp-2">
            &ldquo;{selectedText}&rdquo;
          </p>
          <Textarea
            placeholder="메모를 입력하세요..."
            className="mb-2 min-h-[80px] resize-none text-sm"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-1">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                title={`${c.label}으로 저장`}
                className={cn(
                  'h-4 w-4 rounded-full border border-border transition-transform hover:scale-110',
                  c.bg
                )}
                onClick={() => handleNoteSubmit(c.id as HighlightColor)}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function TextHighlighter({ clipId, children }: TextHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState<ToolbarPosition | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [savedRange, setSavedRange] = useState<{
    startPath: string;
    endPath: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);

  const { data: annotations = [] } = useAnnotations(clipId);
  const createAnnotation = useCreateAnnotation();
  const deleteAnnotation = useDeleteAnnotation();

  // 하이라이트 렌더링 (annotations 변경 시)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    applyHighlights(container, annotations as Annotation[]);
  }, [annotations]);

  // mark 클릭으로 삭제
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMarkClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const mark = target.closest('mark[data-annotation-id]') as HTMLElement | null;
      if (!mark) return;
      const id = mark.dataset.annotationId;
      if (!id) return;

      if (confirm('이 하이라이트를 삭제하시겠습니까?')) {
        deleteAnnotation.mutate({ annotationId: id, clipId });
      }
    };

    container.addEventListener('click', handleMarkClick);
    return () => container.removeEventListener('click', handleMarkClick);
  }, [clipId, deleteAnnotation]);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const text = selection.toString().trim();
    if (!text || text.length < 2) {
      setToolbarPos(null);
      setSelectedText('');
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const range = selection.getRangeAt(0);

    // 컨테이너 내부 선택인지 확인
    if (!container.contains(range.commonAncestorContainer)) return;

    const rect = range.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top - 8;

    // 경로 저장
    const startPath = getNodePath(range.startContainer, container);
    const endPath = getNodePath(range.endContainer, container);

    setSavedRange({
      startPath,
      endPath,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
    });

    setSelectedText(text);
    setToolbarPos({ x, y });
  }, []);

  const handleHighlight = useCallback(
    (color: HighlightColor, noteText?: string) => {
      if (!savedRange) return;

      createAnnotation.mutate({
        clipId,
        type: 'highlight',
        selected_text: selectedText,
        note_text: noteText ?? null,
        position_data: savedRange,
        color,
      });

      window.getSelection()?.removeAllRanges();
    },
    [clipId, savedRange, selectedText, createAnnotation]
  );

  const handleClose = useCallback(() => {
    setToolbarPos(null);
    setSelectedText('');
    setSavedRange(null);
  }, []);

  // 외부 클릭 시 툴바 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!toolbarPos) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-radix-popper-content-wrapper]')) return;
      if (containerRef.current?.contains(target)) return;
      handleClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [toolbarPos, handleClose]);

  return (
    <>
      <div ref={containerRef} onMouseUp={handleMouseUp} className="relative">
        {children}
      </div>

      {toolbarPos && selectedText && (
        <FloatingToolbar
          position={toolbarPos}
          selectedText={selectedText}
          onHighlight={handleHighlight}
          onClose={handleClose}
        />
      )}
    </>
  );
}

// ─── 하이라이트 뱃지 (목록용) ─────────────────────────────────────────────────

interface HighlightBadgeProps {
  color: string;
  className?: string;
}

export function HighlightBadge({ color, className }: HighlightBadgeProps) {
  const found = HIGHLIGHT_COLORS.find((c) => c.id === color);
  return (
    <span
      className={cn(
        'inline-block h-3 w-3 rounded-full border border-border',
        found?.bg ?? 'bg-yellow-200',
        className
      )}
      title={found?.label ?? color}
    />
  );
}

export { HIGHLIGHT_COLORS };
export type { Annotation, HighlightColor };
