'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Loader2, Star, Archive, Trash2, FolderPlus, Tag, CheckSquare, X, Square } from 'lucide-react';
import { toast } from 'sonner';
import type { ClipData } from '@/types/database';
import { ClipCard } from '@/components/clips/clip-card';
import { ClipRow } from '@/components/clips/clip-row';
import { ClipHeadline } from '@/components/clips/clip-headline';
import { AriaLive } from '@/components/ui/aria-live';
import { useUIStore } from '@/stores/ui-store';
import { useToggleFavorite, useToggleArchive, useDeleteClip } from '@/lib/hooks/use-clip-mutations';
import { useCategories } from '@/lib/hooks/use-categories';
import { useListKeyboardNav } from '@/lib/hooks/use-list-keyboard-nav';
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
import { BulkTagDialog } from '@/components/clips/bulk-tag-dialog';
import { BulkCollectionDialog } from '@/components/clips/bulk-collection-dialog';

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
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [ariaMessage, setAriaMessage] = useState('');

  // clips 개수가 변할 때마다 스크린리더에 결과 수 안내
  const prevClipsLengthRef = useRef<number | null>(null);
  useEffect(() => {
    // 최초 마운트는 건너뜀 (null 상태)
    if (prevClipsLengthRef.current === null) {
      prevClipsLengthRef.current = clips.length;
      return;
    }
    if (prevClipsLengthRef.current !== clips.length) {
      setAriaMessage(`클립 ${clips.length}개 표시 중`);
      prevClipsLengthRef.current = clips.length;
    }
  }, [clips.length]);

  const toggleFavorite = useToggleFavorite();
  const toggleArchive = useToggleArchive();
  const deleteClip = useDeleteClip();
  const { data: categories = [] } = useCategories();

  const categoryMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }>();
    categories.forEach((c) => map.set(c.id, { name: c.name, color: c.color }));
    return map;
  }, [categories]);

  const handleToggleFavorite = useCallback(
    (id: string) => {
      const clip = clips.find((c) => c.id === id);
      if (clip) toggleFavorite.mutate({ clipId: id, isFavorite: clip.is_favorite });
    },
    [clips, toggleFavorite]
  );

  const handleArchive = useCallback(
    (id: string) => {
      const clip = clips.find((c) => c.id === id);
      if (clip) toggleArchive.mutate({ clipId: id, isArchived: clip.is_archived });
    },
    [clips, toggleArchive]
  );

  const { focusedIndex } = useListKeyboardNav({ clips });

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
      <AriaLive message={ariaMessage} priority="polite" />

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
            onClick={() => setTagDialogOpen(true)}
            disabled={selectedCount === 0 || isBulkPending}
            className="flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-spring hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="선택한 클립에 태그 추가"
          >
            <Tag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">태그 추가</span>
          </button>

          <button
            onClick={() => setCollectionDialogOpen(true)}
            disabled={selectedCount === 0 || isBulkPending}
            className="flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-spring hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="선택한 클립을 컬렉션에 추가"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">컬렉션에 추가</span>
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
        <div className="flex flex-col" role="list" aria-label={`클립 목록 ${clips.length}개`}>
          {clips.map((clip, i) => {
            const delayClass = STAGGER_DELAYS[Math.min(i, STAGGER_DELAYS.length - 1)];
            const isFocused = focusedIndex === i;
            return (
              <div
                key={clip.id}
                role="listitem"
                data-clip-index={i}
                className={cn(
                  'animate-fade-in-up fill-both rounded-xl transition-shadow',
                  delayClass,
                  isFocused && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                )}
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
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            role="list"
            aria-label={`클립 목록 ${clips.length}개`}
          >
            {clips.map((clip, i) => {
              const delayClass = STAGGER_DELAYS[Math.min(i, STAGGER_DELAYS.length - 1)];
              const isSelected = selectedClipIds.has(clip.id);
              const isFocused = focusedIndex === i;
              return (
                <div
                  key={clip.id}
                  role="listitem"
                  data-clip-index={i}
                  className={cn(
                    'animate-fade-in-up fill-both rounded-2xl transition-shadow',
                    delayClass,
                    isFocused && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                  )}
                >
                  <ClipCard
                    clip={clip}
                    isSelected={isSelected}
                    isSelectionMode={isSelectionMode || selectedCount > 0}
                    onToggleSelect={() => toggleClipSelection(clip.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onArchive={handleArchive}
                    categoryName={clip.category_id ? categoryMap.get(clip.category_id)?.name : undefined}
                    categoryColor={clip.category_id ? categoryMap.get(clip.category_id)?.color : undefined}
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
          <div
            className="flex flex-col gap-1"
            role="list"
            aria-label={`클립 목록 ${clips.length}개`}
          >
            {clips.map((clip, i) => {
              const delayClass = STAGGER_DELAYS[Math.min(i, STAGGER_DELAYS.length - 1)];
              const isSelected = selectedClipIds.has(clip.id);
              const isFocused = focusedIndex === i;
              return (
                <div
                  key={clip.id}
                  role="listitem"
                  data-clip-index={i}
                  className={cn(
                    'animate-fade-in-up fill-both rounded-xl transition-shadow',
                    delayClass,
                    isFocused && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                  )}
                >
                  <ClipRow
                    clip={clip}
                    isSelected={isSelected}
                    isSelectionMode={isSelectionMode || selectedCount > 0}
                    onToggleSelect={() => toggleClipSelection(clip.id)}
                    onToggleFavorite={handleToggleFavorite}
                    categoryName={clip.category_id ? categoryMap.get(clip.category_id)?.name : undefined}
                    categoryColor={clip.category_id ? categoryMap.get(clip.category_id)?.color : undefined}
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

      {/* Bulk tag dialog */}
      <BulkTagDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        clipIds={Array.from(selectedClipIds)}
        onSuccess={clearSelection}
      />

      {/* Bulk collection dialog */}
      <BulkCollectionDialog
        open={collectionDialogOpen}
        onOpenChange={setCollectionDialogOpen}
        clipIds={Array.from(selectedClipIds)}
        onSuccess={clearSelection}
      />
    </div>
  );
}
