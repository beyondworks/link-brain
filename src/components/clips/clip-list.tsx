'use client';

import { useRef, useEffect, useState } from 'react';
import { Loader2, Star, Archive, Trash2, FolderPlus, CheckSquare, X, Square } from 'lucide-react';
import { toast } from 'sonner';
import type { ClipData } from '@/types/database';
import { ClipCard } from '@/components/clips/clip-card';
import { ClipRow } from '@/components/clips/clip-row';
import { ClipHeadline } from '@/components/clips/clip-headline';
import { useUIStore } from '@/stores/ui-store';
import { useToggleFavorite, useToggleArchive, useDeleteClip } from '@/lib/hooks/use-clip-mutations';
import { cn } from '@/lib/utils';
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

interface ClipListProps {
  clips: ClipData[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
}

// Stagger delay classes for list items
const STAGGER_DELAYS = [
  'animation-delay-75',
  'animation-delay-150',
  'animation-delay-200',
  'animation-delay-300',
  'animation-delay-400',
  'animation-delay-500',
] as const;

export function ClipList({
  clips,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: ClipListProps) {
  const viewMode = useUIStore((s) => s.viewMode);
  const selectedClipIds = useUIStore((s) => s.selectedClipIds);
  const isSelectionMode = useUIStore((s) => s.isSelectionMode);
  const toggleClipSelection = useUIStore((s) => s.toggleClipSelection);
  const selectAllClips = useUIStore((s) => s.selectAllClips);
  const clearSelection = useUIStore((s) => s.clearSelection);
  // setSelectionMode used by parent — omit from local destructure

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const toggleFavorite = useToggleFavorite();
  const toggleArchive = useToggleArchive();
  const deleteClip = useDeleteClip();

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !fetchNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const selectedCount = selectedClipIds.size;
  const allClipIds = clips.map((c) => c.id);
  const allSelected = allClipIds.length > 0 && allClipIds.every((id) => selectedClipIds.has(id));

  function handleSelectAll() {
    if (allSelected) {
      clearSelection();
    } else {
      selectAllClips(allClipIds);
    }
  }

  async function handleBulkFavorite() {
    const ids = Array.from(selectedClipIds);
    const clipMap = new Map(clips.map((c) => [c.id, c]));
    await Promise.all(
      ids.map((id) => {
        const clip = clipMap.get(id);
        if (!clip) return Promise.resolve();
        return toggleFavorite.mutateAsync({ clipId: id, isFavorite: clip.is_favorite ?? false });
      })
    );
    toast.success(`${ids.length}개 클립의 즐겨찾기가 변경되었습니다.`);
    clearSelection();
  }

  async function handleBulkArchive() {
    const ids = Array.from(selectedClipIds);
    const clipMap = new Map(clips.map((c) => [c.id, c]));
    await Promise.all(
      ids.map((id) => {
        const clip = clipMap.get(id);
        if (!clip) return Promise.resolve();
        return toggleArchive.mutateAsync({ clipId: id, isArchived: clip.is_archived ?? false });
      })
    );
    toast.success(`${ids.length}개 클립이 아카이브되었습니다.`);
    clearSelection();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedClipIds);
    await Promise.all(ids.map((id) => deleteClip.mutateAsync({ clipId: id })));
    toast.success(`${ids.length}개 클립이 삭제되었습니다.`);
    clearSelection();
    setDeleteDialogOpen(false);
  }

  const showToolbar = isSelectionMode || selectedCount > 0;
  const isBulkPending =
    toggleFavorite.isPending || toggleArchive.isPending || deleteClip.isPending;

  if (clips.length === 0) {
    return (
      <div className="animate-fade-in-up flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-bold text-foreground">클립이 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">
          상단의 + 버튼을 눌러 첫 번째 클립을 추가해보세요.
        </p>
      </div>
    );
  }

  const footer = (
    <>
      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      )}
    </>
  );

  return (
    <div>
      {/* Selection toolbar */}
      {showToolbar && (
        <div
          className={cn(
            'sticky top-0 z-[var(--z-sticky)] mb-4 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/95 px-4 py-2.5 shadow-card backdrop-blur-md',
            'animate-fade-in-up'
          )}
        >
          {/* Select all checkbox */}
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm font-medium text-foreground transition-spring hover:text-primary"
            aria-label="전체 선택"
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="hidden sm:inline">전체 선택</span>
          </button>

          {/* Count */}
          <span className="min-w-[60px] text-sm font-semibold text-foreground">
            {selectedCount}개 선택됨
          </span>

          <div className="flex-1" />

          {/* Action buttons */}
          <button
            onClick={handleBulkFavorite}
            disabled={selectedCount === 0 || isBulkPending}
            className="flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-spring hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="선택한 클립 즐겨찾기"
          >
            <Star className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">즐겨찾기</span>
          </button>

          <button
            onClick={handleBulkArchive}
            disabled={selectedCount === 0 || isBulkPending}
            className="flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-spring hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="선택한 클립 아카이브"
          >
            <Archive className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">아카이브</span>
          </button>

          <button
            onClick={() => setDeleteDialogOpen(true)}
            disabled={selectedCount === 0 || isBulkPending}
            className="flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-spring hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="선택한 클립 삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">삭제</span>
          </button>

          <button
            disabled
            className="flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground opacity-40 cursor-not-allowed"
            aria-label="컬렉션으로 이동 (준비 중)"
            title="준비 중"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">컬렉션으로 이동</span>
          </button>

          {/* Cancel */}
          <button
            onClick={clearSelection}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-spring hover:bg-accent hover:text-foreground"
            aria-label="선택 취소"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Headlines view */}
      {viewMode === 'headlines' && (
        <div className="flex flex-col">
          {clips.map((clip, i) => {
            const delayClass = STAGGER_DELAYS[Math.min(i, STAGGER_DELAYS.length - 1)];
            return (
              <div
                key={clip.id}
                className={cn('animate-fade-in-up fill-both', delayClass)}
              >
                <ClipHeadline clip={clip} />
              </div>
            );
          })}
          {footer}
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {clips.map((clip, i) => {
              const delayClass = STAGGER_DELAYS[Math.min(i, STAGGER_DELAYS.length - 1)];
              const isSelected = selectedClipIds.has(clip.id);
              return (
                <div
                  key={clip.id}
                  className={cn('animate-fade-in-up fill-both', delayClass)}
                >
                  <ClipCard
                    clip={clip}
                    isSelected={isSelected}
                    isSelectionMode={isSelectionMode || selectedCount > 0}
                    onToggleSelect={() => toggleClipSelection(clip.id)}
                  />
                </div>
              );
            })}
          </div>
          {footer}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div>
          <div className="flex flex-col gap-1">
            {clips.map((clip, i) => {
              const delayClass = STAGGER_DELAYS[Math.min(i, STAGGER_DELAYS.length - 1)];
              const isSelected = selectedClipIds.has(clip.id);
              return (
                <div
                  key={clip.id}
                  className={cn('animate-fade-in-up fill-both', delayClass)}
                >
                  <ClipRow
                    clip={clip}
                    isSelected={isSelected}
                    isSelectionMode={isSelectionMode || selectedCount > 0}
                    onToggleSelect={() => toggleClipSelection(clip.id)}
                  />
                </div>
              );
            })}
          </div>
          {footer}
        </div>
      )}

      {/* Bulk delete confirm dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>클립 {selectedCount}개를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 클립을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${selectedCount}개 삭제`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
