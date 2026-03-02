'use client';

import { useState, useRef, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useTags, useCreateTag } from '@/lib/hooks/use-tags';
import { useSupabase } from '@/components/providers/supabase-provider';
import { Hash, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tag } from '@/lib/hooks/use-tags';

interface Props {
  clipId: string;
}

/** Fetch the tags already attached to a specific clip. */
function useClipTags(clipId: string) {
  return useQuery({
    queryKey: ['clip-tags', clipId],
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await supabase
        .from('clip_tags')
        .select('tag_id, tags(id, name)')
        .eq('clip_id', clipId);
      if (error) throw error;
      return (data ?? [])
        .map((row) => {
          const t = row.tags;
          if (!t) return null;
          // Supabase returns nested select as array; take first element
          const tag = Array.isArray(t) ? t[0] : t;
          if (!tag || typeof tag !== 'object' || !('id' in tag)) return null;
          return tag as Tag;
        })
        .filter((t): t is Tag => t !== null);
    },
    staleTime: 30_000,
  });
}

/** Add a tag to the clip (insert into clip_tags). */
function useAddClipTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clipId, tagId }: { clipId: string; tagId: string }) => {
      const { error } = await supabase
        .from('clip_tags')
        .upsert({ clip_id: clipId, tag_id: tagId });
      if (error) throw error;
    },
    onSuccess: (_data, { clipId }) => {
      queryClient.invalidateQueries({ queryKey: ['clip-tags', clipId] });
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
  });
}

/** Remove a tag from the clip (delete from clip_tags). */
function useRemoveClipTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clipId, tagId }: { clipId: string; tagId: string }) => {
      const { error } = await supabase
        .from('clip_tags')
        .delete()
        .eq('clip_id', clipId)
        .eq('tag_id', tagId);
      if (error) throw error;
    },
    onMutate: async ({ clipId, tagId }) => {
      await queryClient.cancelQueries({ queryKey: ['clip-tags', clipId] });
      const prev = queryClient.getQueryData<Tag[]>(['clip-tags', clipId]);
      queryClient.setQueryData<Tag[]>(['clip-tags', clipId], (old) =>
        (old ?? []).filter((t) => t.id !== tagId)
      );
      return { prev };
    },
    onError: (_err, { clipId }, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['clip-tags', clipId], ctx.prev);
    },
    onSettled: (_data, _err, { clipId }) => {
      queryClient.invalidateQueries({ queryKey: ['clip-tags', clipId] });
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
  });
}

export function ClipTagEditor({ clipId }: Props) {
  const { user } = useSupabase();
  const { data: clipTags = [] } = useClipTags(clipId);
  const { data: allTags = [] } = useTags();
  const createTag = useCreateTag();
  const addClipTag = useAddClipTag();
  const removeClipTag = useRemoveClipTag();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const clipTagIds = new Set(clipTags.map((t) => t.id));
  const filtered = allTags
    .filter((t) => !clipTagIds.has(t.id))
    .filter((t) => t.name.toLowerCase().includes(input.toLowerCase()));

  const showCreateOption =
    input.trim().length > 0 &&
    !allTags.some((t) => t.name.toLowerCase() === input.trim().toLowerCase());

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setInput('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!user) return null;

  const handleSelect = async (tag: Tag) => {
    await addClipTag.mutateAsync({ clipId, tagId: tag.id });
    setInput('');
    setOpen(false);
  };

  const handleCreate = async () => {
    const name = input.trim();
    if (!name) return;
    const tag = await createTag.mutateAsync(name);
    await addClipTag.mutateAsync({ clipId, tagId: tag.id });
    setInput('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0 && !showCreateOption) {
        handleSelect(filtered[0]);
      } else if (showCreateOption) {
        handleCreate();
      }
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setInput('');
    }
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 animate-fade-in-up animation-delay-200">
      {clipTags.map((tag) => (
        <span
          key={tag.id}
          className="group flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 pl-2 pr-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Hash size={10} />
          {tag.name}
          <button
            type="button"
            onClick={() => removeClipTag.mutate({ clipId, tagId: tag.id })}
            className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary/20"
            aria-label={`${tag.name} 태그 제거`}
          >
            <X size={9} />
          </button>
        </span>
      ))}

      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
            open
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border/60 bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-primary'
          )}
          aria-label="태그 추가"
        >
          <Plus size={10} />
          태그 추가
        </button>

        {open && (
          <div className="absolute left-0 top-full z-[var(--z-dropdown)] mt-1.5 w-56 rounded-xl border border-border/60 bg-card shadow-elevated overflow-hidden">
            <div className="border-b border-border/40 px-3 py-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="태그 검색 또는 생성..."
                className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            <div className="max-h-44 overflow-y-auto py-1">
              {filtered.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleSelect(tag)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors"
                >
                  <Hash size={10} className="text-muted-foreground" />
                  {tag.name}
                </button>
              ))}

              {showCreateOption && (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus size={10} />
                  <span>
                    <span className="text-muted-foreground">생성: </span>
                    &ldquo;{input.trim()}&rdquo;
                  </span>
                </button>
              )}

              {filtered.length === 0 && !showCreateOption && (
                <p className="px-3 py-2 text-xs text-muted-foreground">태그 없음</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
