'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PenLine, Check, Loader2, ChevronDown, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface ClipNotesProps {
  clipId: string;
  initialNotes?: string | null;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function ClipNotes({ clipId, initialNotes }: ClipNotesProps) {
  const [value, setValue] = useState(initialNotes ?? '');
  const [isExpanded, setIsExpanded] = useState(!!(initialNotes));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the latest unsaved value so we can flush on unmount
  const pendingValueRef = useRef<string | null>(null);
  const clipIdRef = useRef(clipId);
  clipIdRef.current = clipId;

  // Sync if initialNotes changes (e.g. refetch)
  useEffect(() => {
    setValue(initialNotes ?? '');
    if (initialNotes) setIsExpanded(true);
  }, [initialNotes]);

  const save = useCallback(
    async (notes: string) => {
      setSaveStatus('saving');
      const { error } = await supabase
        .from('clips')
        .update({ notes } as never)
        .eq('id', clipIdRef.current);

      if (!error) {
        pendingValueRef.current = null;
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        console.error('[ClipNotes] save failed:', error.message);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    },
    []
  );

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    if (next.length > 2000) return;
    setValue(next);
    pendingValueRef.current = next;
    setSaveStatus('idle');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pendingValueRef.current = null;
      save(next);
    }, 1000);
  }

  // Flush pending save on unmount (fire-and-forget)
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const pending = pendingValueRef.current;
      if (pending !== null) {
        // Fire-and-forget: save immediately before unmount
        supabase
          .from('clips')
          .update({ notes: pending } as never)
          .eq('id', clipIdRef.current)
          .then();
      }
    };
  }, []);

  function handleToggle() {
    setIsExpanded((prev) => !prev);
  }

  return (
    <div className="mb-5 rounded-2xl border border-border/60 bg-muted/20 shadow-card animate-fade-in-up animation-delay-350">
      {/* Header — always visible */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition-colors hover:bg-muted/30"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <PenLine size={14} className="shrink-0 text-primary/70" />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            내 메모
          </span>
          {value && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {value.length}자
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 size={11} className="animate-spin" />
              저장 중...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-[11px] text-primary">
              <Check size={11} />
              저장됨
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-[11px] text-destructive">
              <AlertCircle size={11} />
              저장 실패
            </span>
          )}
          <ChevronDown
            size={14}
            className={cn(
              'text-muted-foreground/60 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Expandable textarea */}
      {isExpanded && (
        <div className="px-5 pb-4">
          <textarea
            value={value}
            onChange={handleChange}
            placeholder="이 클립에 대한 메모를 작성하세요..."
            rows={3}
            maxLength={2000}
            className={cn(
              'w-full resize-y rounded-xl border border-border/50 bg-background/60 px-4 py-3',
              'text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50',
              'transition-colors focus:border-primary/40 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary/20',
              'min-h-[80px] max-h-[280px]'
            )}
          />
          <div className="mt-1.5 flex justify-end">
            <span className="text-[11px] text-muted-foreground/40">
              {value.length} / 2000
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
