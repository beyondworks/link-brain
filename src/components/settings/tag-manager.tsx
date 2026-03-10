'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/components/providers/supabase-provider';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, Check, X, ArrowDownUp, Merge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagWithCount {
  id: string;
  name: string;
  clip_count: number;
}

type SortMode = 'name' | 'count';

function useTagsWithCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['tags-with-count', userId],
    queryFn: async (): Promise<TagWithCount[]> => {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name, clip_tags(count)')
        .order('name');
      if (error) throw error;
      return ((data ?? []) as Array<{ id: string; name: string; clip_tags: Array<{ count: number }> }>).map(
        (t) => ({
          id: t.id,
          name: t.name,
          clip_count: t.clip_tags?.[0]?.count ?? 0,
        }),
      );
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function TagManager() {
  const { user } = useSupabase();
  const queryClient = useQueryClient();
  const { data: tags, isLoading } = useTagsWithCount(user?.id);

  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TagWithCount | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTargetName, setMergeTargetName] = useState('');
  const [showAll, setShowAll] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tags-with-count'] });
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    queryClient.invalidateQueries({ queryKey: ['clips'] });
  };

  const renameTag = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('tags').update({ name } as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast.success('태그 이름이 변경되었습니다');
    },
    onError: () => toast.error('태그 이름 변경에 실패했습니다'),
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success('태그가 삭제되었습니다');
    },
    onError: () => toast.error('태그 삭제에 실패했습니다'),
  });

  const mergeTags = useMutation({
    mutationFn: async ({ sourceIds, targetName }: { sourceIds: string[]; targetName: string }) => {
      // Upsert target tag
      const { data: targetData, error: upsertErr } = await supabase
        .from('tags')
        .upsert({ name: targetName } as never, { onConflict: 'name' })
        .select('id')
        .single();
      if (upsertErr || !targetData) throw upsertErr ?? new Error('대상 태그 생성 실패');

      const targetId = (targetData as { id: string }).id;

      for (const srcId of sourceIds) {
        if (srcId === targetId) continue;
        // Move clip_tags from source → target (ignore duplicate conflicts)
        const { data: srcClips } = await supabase
          .from('clip_tags')
          .select('clip_id')
          .eq('tag_id', srcId);

        if (srcClips && srcClips.length > 0) {
          const rows = (srcClips as Array<{ clip_id: string }>).map((r) => ({
            clip_id: r.clip_id,
            tag_id: targetId,
          }));
          await supabase.from('clip_tags').upsert(rows as never, { onConflict: 'clip_id,tag_id' });
        }

        await supabase.from('tags').delete().eq('id', srcId);
      }
    },
    onSuccess: () => {
      invalidate();
      setMergeDialogOpen(false);
      setSelectedIds(new Set());
      setMergeTargetName('');
      toast.success('태그가 병합되었습니다');
    },
    onError: () => toast.error('태그 병합에 실패했습니다'),
  });

  function startEdit(tag: TagWithCount) {
    setEditingId(tag.id);
    setEditValue(tag.name);
  }

  function commitEdit(id: string) {
    const trimmed = editValue.trim();
    if (!trimmed) {
      toast.error('태그 이름을 입력해 주세요');
      return;
    }
    renameTag.mutate({ id, name: trimmed });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sorted = [...(tags ?? [])].sort((a, b) =>
    sortMode === 'name' ? a.name.localeCompare(b.name) : b.clip_count - a.clip_count,
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl shimmer" />
        ))}
      </div>
    );
  }

  if (!tags || tags.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          태그가 없습니다. 클립에 태그를 추가하면 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 gap-1.5 rounded-lg px-2.5 text-xs',
              sortMode === 'name' && 'bg-muted text-foreground',
            )}
            onClick={() => setSortMode('name')}
          >
            <ArrowDownUp size={11} />
            이름순
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 gap-1.5 rounded-lg px-2.5 text-xs',
              sortMode === 'count' && 'bg-muted text-foreground',
            )}
            onClick={() => setSortMode('count')}
          >
            <ArrowDownUp size={11} />
            사용순
          </Button>
        </div>

        {selectedIds.size >= 2 && (
          <Button
            size="sm"
            className="h-7 gap-1.5 rounded-lg bg-gradient-brand px-2.5 text-xs shadow-none hover-scale glow-brand font-semibold"
            onClick={() => {
              const first = sorted.find((t) => selectedIds.has(t.id));
              setMergeTargetName(first?.name ?? '');
              setMergeDialogOpen(true);
            }}
          >
            <Merge size={11} />
            병합 ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Tag list */}
      <div className="space-y-1.5">
        {(showAll ? sorted : sorted.slice(0, 5)).map((tag) => (
          <div
            key={tag.id}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors',
              selectedIds.has(tag.id)
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-muted/20 hover:bg-muted/40',
            )}
          >
            {/* Select checkbox area */}
            <button
              type="button"
              onClick={() => toggleSelect(tag.id)}
              className="h-4 w-4 shrink-0 rounded border border-border bg-background transition-colors hover:border-primary/60 focus:outline-none"
              aria-label={selectedIds.has(tag.id) ? '선택 해제' : '선택'}
            >
              {selectedIds.has(tag.id) && (
                <Check size={10} className="mx-auto text-primary" />
              )}
            </button>

            {/* Inline edit or name */}
            {editingId === tag.id ? (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit(tag.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="h-7 flex-1 rounded-lg px-2 py-0 text-sm focus-visible:ring-primary/30"
                autoFocus
              />
            ) : (
              <span className="flex-1 text-sm text-foreground">{tag.name}</span>
            )}

            {/* Clip count */}
            <Badge
              variant="secondary"
              className="shrink-0 rounded-md px-1.5 py-0 text-xs font-normal tabular-nums"
            >
              {tag.clip_count}
            </Badge>

            {/* Action buttons */}
            {editingId === tag.id ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 rounded-md p-0 text-primary hover:bg-primary/10"
                  onClick={() => commitEdit(tag.id)}
                  disabled={renameTag.isPending}
                  aria-label="저장"
                >
                  <Check size={12} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 rounded-md p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditingId(null)}
                  aria-label="취소"
                >
                  <X size={12} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 rounded-md p-0 text-muted-foreground hover:text-foreground transition-spring"
                  onClick={() => startEdit(tag)}
                  aria-label="태그 이름 변경"
                >
                  <Pencil size={12} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 rounded-md p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-spring"
                  onClick={() => setDeleteTarget(tag)}
                  aria-label="태그 삭제"
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show more / collapse */}
      {sorted.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-2 w-full rounded-xl border border-border bg-transparent px-4 py-2.5 text-xs font-medium text-muted-foreground transition-spring hover:bg-muted/40 hover:text-foreground"
        >
          {showAll ? '접기 ▲' : `더 보기 (${sorted.length - 5}개) ▼`}
        </button>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>태그를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; 태그를 삭제합니다.{' '}
              {(deleteTarget?.clip_count ?? 0) > 0 &&
                `${deleteTarget?.clip_count}개 클립에서 제거됩니다. `}
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">취소</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteTag.mutate(deleteTarget.id)}
              disabled={deleteTag.isPending}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={(o) => { if (!o) setMergeDialogOpen(false); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Merge size={15} className="text-primary" />
              태그 병합
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              선택한 {selectedIds.size}개 태그를 하나로 합칩니다. 대상 태그 이름을 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {sorted
                .filter((t) => selectedIds.has(t.id))
                .map((t) => (
                  <Badge key={t.id} variant="secondary" className="rounded-md text-xs">
                    {t.name}
                  </Badge>
                ))}
            </div>

            <Input
              value={mergeTargetName}
              onChange={(e) => setMergeTargetName(e.target.value)}
              placeholder="병합 후 태그 이름"
              className="rounded-xl focus-visible:ring-primary/30"
              autoFocus
            />
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              className="flex-1 gap-2 rounded-xl bg-gradient-brand glow-brand shadow-none transition-spring hover-scale font-semibold"
              disabled={!mergeTargetName.trim() || mergeTags.isPending}
              onClick={() =>
                mergeTags.mutate({
                  sourceIds: Array.from(selectedIds),
                  targetName: mergeTargetName.trim(),
                })
              }
            >
              <Merge size={14} />
              {mergeTags.isPending ? '병합 중...' : '병합'}
            </Button>
            <Button
              variant="outline"
              className="rounded-xl transition-spring"
              onClick={() => setMergeDialogOpen(false)}
            >
              취소
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
