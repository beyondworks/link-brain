'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useCollections } from '@/lib/hooks/use-collections';
import { useMoveToCollection } from '@/lib/hooks/use-move-to-collection';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { FolderPlus, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  clipId: string;
}

/** Fetch collection IDs this clip already belongs to. */
function useClipCollections(clipId: string) {
  return useQuery({
    queryKey: ['clip-collections', clipId],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('clip_collections')
        .select('collection_id')
        .eq('clip_id', clipId);
      if (error) throw error;
      return (data as Array<{ collection_id: string }> ?? []).map((row) => row.collection_id);
    },
    staleTime: 30_000,
  });
}

export function ClipCollectionAssigner({ clipId }: Props) {
  const { user } = useCurrentUser();
  const { data: collections = [] } = useCollections();
  const { data: assignedIds = [] } = useClipCollections(clipId);
  const moveToCollection = useMoveToCollection();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
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

  if (!user || collections.length === 0) return null;

  const handleSelect = (collectionId: string) => {
    moveToCollection.mutate(
      { clipId, collectionId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['clip-collections', clipId] });
        },
      }
    );
    setOpen(false);
  };

  const assignedCount = assignedIds.length;

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
        aria-label="컬렉션에 추가"
      >
        <FolderPlus size={12} />
        컬렉션에 추가
        {assignedCount > 0 && (
          <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary leading-none">
            {assignedCount}
          </span>
        )}
        <ChevronDown
          size={11}
          className={cn('transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[var(--z-dropdown)] mt-1.5 w-52 rounded-xl border border-border/60 bg-card shadow-elevated overflow-hidden">
          <div className="py-1">
            {collections.map((col) => {
              const already = assignedIds.includes(col.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => !already && handleSelect(col.id)}
                  disabled={already || moveToCollection.isPending}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors',
                    already
                      ? 'cursor-default text-primary'
                      : 'text-foreground hover:bg-muted/60'
                  )}
                >
                  <Check
                    size={11}
                    className={cn(
                      'shrink-0 transition-opacity',
                      already ? 'opacity-100 text-primary' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{col.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
