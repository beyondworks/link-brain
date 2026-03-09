'use client';

import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useCategories } from '@/lib/hooks/use-categories';
import { Tag, Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  clipId: string;
  currentCategoryId: string | null;
}

export function ClipCategorySelector({ clipId, currentCategoryId }: Props) {
  const { data: categories = [] } = useCategories();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (categories.length === 0) return null;

  const current = currentCategoryId
    ? categories.find((c) => c.id === currentCategoryId)
    : undefined;

  async function handleSelect(categoryId: string | null) {
    setPending(true);
    try {
      const { error } = await supabase
        .from('clips')
        .update({ category_id: categoryId } as never)
        .eq('id', clipId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      queryClient.invalidateQueries({ queryKey: ['clip', clipId] });
    } catch {
      toast.error('카테고리 변경에 실패했습니다');
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
          open
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border/60 bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-primary'
        )}
        aria-label="카테고리 변경"
      >
        {current ? (
          <>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: current.color ?? '#21DBA4' }}
            />
            {current.name}
          </>
        ) : (
          <>
            <Tag size={12} />
            카테고리 선택
          </>
        )}
        <ChevronDown
          size={11}
          className={cn('transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[60] mt-1.5 w-52 rounded-xl border border-border shadow-lg overflow-hidden" style={{ backgroundColor: 'var(--popover)' }}>
          <div className="py-1">
            <button
              type="button"
              onClick={() => void handleSelect(null)}
              disabled={pending || !currentCategoryId}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors',
                !currentCategoryId
                  ? 'cursor-default text-primary'
                  : 'text-foreground hover:bg-muted/60'
              )}
            >
              <X
                size={11}
                className={cn(
                  'shrink-0 transition-opacity',
                  !currentCategoryId ? 'opacity-100 text-primary' : 'opacity-0'
                )}
              />
              <span className="text-muted-foreground">없음</span>
            </button>

            {categories.map((cat) => {
              const isSelected = cat.id === currentCategoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => !isSelected && void handleSelect(cat.id)}
                  disabled={pending || isSelected}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors',
                    isSelected
                      ? 'cursor-default text-primary'
                      : 'text-foreground hover:bg-muted/60'
                  )}
                >
                  <Check
                    size={11}
                    className={cn(
                      'shrink-0 transition-opacity',
                      isSelected ? 'opacity-100 text-primary' : 'opacity-0'
                    )}
                  />
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color ?? '#21DBA4' }}
                  />
                  <span className="truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
