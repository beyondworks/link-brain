'use client';

import { useState, useRef, useCallback } from 'react';
import { useImageClips, useImageAlbums } from '@/lib/hooks/use-image-albums';
import {
  useCreateImageAlbum,
  useUpdateImageAlbum,
  useDeleteImageAlbum,
  useAddClipToAlbum,
} from '@/lib/hooks/use-image-album-mutations';
import { useDeleteClip } from '@/lib/hooks/use-clip-mutations';
import { useLongPress } from '@/lib/hooks/use-long-press';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, ImageIcon, MoreHorizontal, Pencil, Trash2, CheckSquare, Square, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { toast } from 'sonner';
import type { ImageAlbum, ClipData } from '@/types/database';

const COLOR_PRESETS = [
  '#21DBA4', '#3B82F6', '#8B5CF6', '#EC4899',
  '#F59E0B', '#EF4444', '#10B981', '#6366F1',
];

export function ImagesClient() {
  const { data: imageClips, isLoading: clipsLoading } = useImageClips();
  const { data: albums = [], isLoading: albumsLoading } = useImageAlbums();
  const createAlbum = useCreateImageAlbum();
  const updateAlbum = useUpdateImageAlbum();
  const deleteAlbumMut = useDeleteImageAlbum();
  const addClipToAlbum = useAddClipToAlbum();
  const deleteClip = useDeleteClip();

  // Image selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const selectedCount = selectedIds.size;
  const allImageIds = (imageClips ?? []).map((c) => c.id);
  const allSelected = allImageIds.length > 0 && allImageIds.every((id) => selectedIds.has(id));

  const toggleImageSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearImageSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, []);

  const handleSelectAllImages = useCallback(() => {
    if (allSelected) {
      clearImageSelection();
    } else {
      setSelectedIds(new Set(allImageIds));
    }
  }, [allSelected, allImageIds, clearImageSelection]);

  const handleBulkDeleteImages = useCallback(async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map((id) => deleteClip.mutateAsync({ clipId: id })));
      toast.success(`이미지 ${ids.length}개가 삭제되었습니다.`);
      clearImageSelection();
    } catch {
      toast.error('일부 이미지 삭제에 실패했습니다.');
    }
    setBulkDeleteOpen(false);
  }, [selectedIds, deleteClip, clearImageSelection]);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ImageAlbum | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ImageAlbum | null>(null);

  // Drag and drop state
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Mobile long-touch drag state
  const longTouchRef = useRef<{ clipId: string; timer: ReturnType<typeof setTimeout>; startY: number } | null>(null);
  const [mobileDrag, setMobileDrag] = useState<{ clipId: string; x: number; y: number; title: string; imageUrl: string | null } | null>(null);
  const mobileDragAlbumRef = useRef<string | null>(null);

  // Desktop drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, clipId: string) => {
    setDragClipId(clipId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', clipId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, albumId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetId(albumId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, albumId: string) => {
    e.preventDefault();
    const clipId = e.dataTransfer.getData('text/plain');
    if (clipId) {
      addClipToAlbum.mutate({ albumId, clipId });
    }
    setDragClipId(null);
    setDropTargetId(null);
  }, [addClipToAlbum]);

  const handleDragEnd = useCallback(() => {
    setDragClipId(null);
    setDropTargetId(null);
  }, []);

  // Mobile long-touch drag handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, clip: ClipData) => {
    const touch = e.touches[0];
    longTouchRef.current = {
      clipId: clip.id,
      startY: touch.clientY,
      timer: setTimeout(() => {
        setMobileDrag({
          clipId: clip.id,
          x: touch.clientX,
          y: touch.clientY,
          title: clip.title ?? 'Image',
          imageUrl: clip.image || (clip.platform === 'image' ? clip.url : null),
        });
      }, 500),
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    // Cancel long press if moved too much before activation
    if (longTouchRef.current && !mobileDrag) {
      const dy = Math.abs(touch.clientY - longTouchRef.current.startY);
      if (dy > 10) {
        clearTimeout(longTouchRef.current.timer);
        longTouchRef.current = null;
        return;
      }
    }
    if (mobileDrag) {
      e.preventDefault();
      setMobileDrag((prev) => prev ? { ...prev, x: touch.clientX, y: touch.clientY } : null);
      // Hit-test album cards
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const albumEl = el?.closest('[data-album-id]');
      mobileDragAlbumRef.current = albumEl?.getAttribute('data-album-id') ?? null;
      setDropTargetId(mobileDragAlbumRef.current);
    }
  }, [mobileDrag]);

  const handleTouchEnd = useCallback(() => {
    if (longTouchRef.current) {
      clearTimeout(longTouchRef.current.timer);
    }
    if (mobileDrag && mobileDragAlbumRef.current) {
      addClipToAlbum.mutate({ albumId: mobileDragAlbumRef.current, clipId: mobileDrag.clipId });
    }
    longTouchRef.current = null;
    mobileDragAlbumRef.current = null;
    setMobileDrag(null);
    setDragClipId(null);
    setDropTargetId(null);
  }, [mobileDrag, addClipToAlbum]);

  const isLoading = clipsLoading || albumsLoading;

  function openEditDialog(album: ImageAlbum, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditTarget(album);
    setEditName(album.name);
    setEditDescription(album.description ?? '');
    setEditColor(album.color ?? '#21DBA4');
    setEditOpen(true);
  }

  function openDeleteDialog(album: ImageAlbum, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(album);
    setDeleteOpen(true);
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <Skeleton className="mb-2 h-8 w-32 rounded-xl shimmer" />
          <Skeleton className="h-4 w-56 rounded-lg shimmer" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const totalImages = imageClips?.length ?? 0;

  return (
    <div className="relative p-6 lg:p-8">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glow-orb absolute -right-20 -top-20 h-56 w-56 opacity-25" />
      </div>

      {/* Header */}
      <div className="relative mb-8 flex items-start justify-between animate-blur-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gradient-brand">이미지</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            업로드한 이미지를 앨범별로 관리하세요
            {totalImages > 0 && (
              <span className="ml-2 text-xs text-muted-foreground/60">{totalImages}개의 이미지</span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          className="bg-gradient-brand glow-brand-sm hover-scale rounded-xl font-semibold text-white shadow-none transition-spring"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={16} className="mr-1.5" />
          새 앨범
        </Button>
      </div>

      {/* Albums Grid */}
      {albums.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">앨범</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <div
                key={album.id}
                data-album-id={album.id}
                onDragOver={(e) => handleDragOver(e, album.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, album.id)}
                className={cn(
                  'group card-glow relative overflow-hidden rounded-2xl border bg-card transition-spring',
                  dropTargetId === album.id
                    ? 'border-primary ring-2 ring-primary/30 scale-[1.02]'
                    : 'border-border'
                )}
              >
                <Link href={`/images/${album.id}`} className="block p-5">
                  <div
                    className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-70"
                    style={{
                      background: `linear-gradient(90deg, ${album.color ?? '#21DBA4'}, transparent)`,
                    }}
                  />
                  <div className="flex items-start justify-between mb-3">
                    <div className="relative mt-0.5 flex-shrink-0">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: album.color ?? '#21DBA4' }}
                      />
                      <div
                        className="absolute inset-0 rounded-full blur-sm opacity-60"
                        style={{ backgroundColor: album.color ?? '#21DBA4' }}
                      />
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground transition-spring group-hover:text-primary">
                    {album.name}
                  </h3>
                  {album.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                      {album.description}
                    </p>
                  )}
                </Link>
                {/* Context menu */}
                <div className="absolute right-3 top-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground focus:outline-none focus:opacity-100"
                        aria-label="앨범 옵션"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        onSelect={(e) => openEditDialog(album, e as unknown as React.MouseEvent)}
                      >
                        <Pencil size={13} />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                        onSelect={(e) => openDeleteDialog(album, e as unknown as React.MouseEvent)}
                      >
                        <Trash2 size={13} />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Images or Empty State */}
      {totalImages === 0 && albums.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="이미지가 없습니다"
          description="이미지를 업로드하면 자동으로 여기에 표시됩니다"
          className="animate-blur-in animation-delay-100"
        />
      ) : totalImages > 0 ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              전체 이미지
              {albums.length > 0 && !isSelectionMode && (
                <span className="ml-2 font-normal text-xs text-muted-foreground/50">
                  이미지를 앨범으로 드래그하여 정리하세요
                </span>
              )}
            </h2>
            {!isSelectionMode ? (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsSelectionMode(true)}
              >
                선택
              </button>
            ) : null}
          </div>

          {/* Selection toolbar */}
          {(isSelectionMode || selectedCount > 0) && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/95 px-4 py-2.5 shadow-card backdrop-blur-md animate-fade-in-up">
              <button
                type="button"
                onClick={handleSelectAllImages}
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

              <span className="min-w-[60px] text-sm font-semibold text-foreground">
                {selectedCount}개 선택됨
              </span>

              <div className="flex-1" />

              <button
                type="button"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={selectedCount === 0 || deleteClip.isPending}
                className="flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-spring hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="선택한 이미지 삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">삭제</span>
              </button>

              <button
                type="button"
                onClick={clearImageSelection}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-spring hover:bg-accent hover:text-foreground"
                aria-label="선택 취소"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
            {imageClips?.map((clip) => {
              const imgUrl = clip.image || (clip.platform === 'image' ? clip.url : null);
              const isSelected = selectedIds.has(clip.id);
              return (
                <ImageTile
                  key={clip.id}
                  clip={clip}
                  imgUrl={imgUrl}
                  isSelected={isSelected}
                  isSelectionMode={isSelectionMode || selectedCount > 0}
                  dragClipId={dragClipId}
                  mobileDrag={mobileDrag}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onToggleSelect={toggleImageSelection}
                  onEnterSelectionMode={() => setIsSelectionMode(true)}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Create Album Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-gradient bg-glass-heavy rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">새 앨범 만들기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="앨범 이름"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="rounded-xl focus-visible:ring-primary/30"
            />
            <Input
              placeholder="설명 (선택)"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              className="rounded-xl focus-visible:ring-primary/30"
            />
            <Button
              className="w-full bg-gradient-brand glow-brand rounded-xl font-semibold shadow-none transition-spring"
              onClick={() => {
                createAlbum.mutate(
                  {
                    name: createName.trim(),
                    description: createDescription.trim() || undefined,
                  },
                  {
                    onSuccess: () => {
                      setCreateOpen(false);
                      setCreateName('');
                      setCreateDescription('');
                    },
                  }
                );
              }}
              disabled={!createName.trim() || createAlbum.isPending}
            >
              {createAlbum.isPending ? '생성 중...' : '만들기'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Album Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-gradient bg-glass-heavy rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">앨범 수정</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              앨범의 이름, 설명, 색상을 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="앨범 이름"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="rounded-xl focus-visible:ring-primary/30"
            />
            <Input
              placeholder="설명 (선택)"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="rounded-xl focus-visible:ring-primary/30"
            />
            <div>
              <p className="mb-2 text-sm text-muted-foreground">색상</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: color,
                      boxShadow: editColor === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none',
                    }}
                    onClick={() => setEditColor(color)}
                    aria-label={`색상 ${color} 선택`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditOpen(false)}
              disabled={updateAlbum.isPending}
            >
              취소
            </Button>
            <Button
              className="bg-gradient-brand glow-brand rounded-xl font-semibold shadow-none transition-spring"
              onClick={() => {
                if (!editTarget) return;
                updateAlbum.mutate(
                  {
                    albumId: editTarget.id,
                    name: editName.trim(),
                    description: editDescription.trim() || null,
                    color: editColor || null,
                  },
                  {
                    onSuccess: () => {
                      setEditOpen(false);
                      setEditTarget(null);
                    },
                  }
                );
              }}
              disabled={!editName.trim() || updateAlbum.isPending}
            >
              {updateAlbum.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile drag preview overlay */}
      {mobileDrag && (
        <div
          className="pointer-events-none fixed z-[70]"
          style={{
            left: mobileDrag.x - 40,
            top: mobileDrag.y - 40,
          }}
        >
          <div className="h-20 w-20 overflow-hidden rounded-xl border-2 border-primary bg-muted shadow-2xl opacity-90">
            {mobileDrag.imageUrl ? (
              <Image
                src={mobileDrag.imageUrl}
                alt=""
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ImageIcon size={24} className="text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Delete Images Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이미지 {selectedCount}개를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 이미지를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteImages}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteClip.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${selectedCount}개 삭제`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Album Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-gradient bg-glass-heavy rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">앨범 삭제</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {deleteTarget && (
                <>
                  <span className="font-medium text-foreground">{deleteTarget.name}</span> 앨범을
                  삭제하시겠습니까? 이미지는 삭제되지 않습니다.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteAlbumMut.isPending}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={() => {
                if (!deleteTarget) return;
                deleteAlbumMut.mutate(
                  { albumId: deleteTarget.id },
                  {
                    onSuccess: () => {
                      setDeleteOpen(false);
                      setDeleteTarget(null);
                    },
                  }
                );
              }}
              disabled={deleteAlbumMut.isPending}
            >
              {deleteAlbumMut.isPending ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ImageTile ────────────────────────────────────────────────────────────────

interface ImageTileProps {
  clip: ClipData;
  imgUrl: string | null;
  isSelected: boolean;
  isSelectionMode: boolean;
  dragClipId: string | null;
  mobileDrag: { clipId: string } | null;
  onDragStart: (e: React.DragEvent, clipId: string) => void;
  onDragEnd: () => void;
  onTouchStart: (e: React.TouchEvent, clip: ClipData) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onToggleSelect: (id: string) => void;
  onEnterSelectionMode: () => void;
}

function ImageTile({
  clip,
  imgUrl,
  isSelected,
  isSelectionMode,
  dragClipId,
  mobileDrag,
  onDragStart,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onToggleSelect,
  onEnterSelectionMode,
}: ImageTileProps) {
  const longPress = useLongPress({
    onLongPress: () => {
      onEnterSelectionMode();
      onToggleSelect(clip.id);
    },
    isEnabled: true,
  });

  function handleClick() {
    if (isSelectionMode) {
      onToggleSelect(clip.id);
      return;
    }
    if (!mobileDrag) {
      useUIStore.getState().openClipPeek(clip.id);
    }
  }

  return (
    <div
      draggable={!isSelectionMode}
      onDragStart={(e) => !isSelectionMode && onDragStart(e, clip.id)}
      onDragEnd={onDragEnd}
      onTouchStart={(e) => {
        longPress.onTouchStart(e);
        if (!isSelectionMode) onTouchStart(e, clip);
      }}
      onTouchMove={(e) => {
        longPress.onTouchMove(e);
        if (!isSelectionMode) onTouchMove(e);
      }}
      onTouchEnd={() => {
        longPress.onTouchEnd();
        if (!isSelectionMode) onTouchEnd();
      }}
      onContextMenu={longPress.onContextMenu}
      onClick={handleClick}
      className={cn(
        'group relative aspect-square overflow-hidden rounded-xl border bg-muted transition-spring',
        isSelectionMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        isSelected
          ? 'border-primary ring-2 ring-primary/40'
          : 'border-border hover:border-border-hover',
        dragClipId === clip.id && 'opacity-40 scale-95'
      )}
    >
      {imgUrl ? (
        <Image
          src={imgUrl}
          alt={clip.title ?? ''}
          fill
          className="object-cover pointer-events-none"
          sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 16vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <ImageIcon size={24} className="text-muted-foreground" />
        </div>
      )}

      {/* Processing overlay */}
      {clip.processing_status && clip.processing_status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <span className="text-[10px] font-medium text-white/90">
            {clip.processing_status === 'failed' ? '실패' : '분석중...'}
          </span>
        </div>
      )}

      {/* Selection checkbox */}
      {(isSelectionMode || isSelected) && (
        <div className="absolute left-1.5 top-1.5 pointer-events-none">
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-primary drop-shadow" />
          ) : (
            <Square className="h-4 w-4 text-white drop-shadow" />
          )}
        </div>
      )}

      {/* Selected overlay tint */}
      {isSelected && (
        <div className="absolute inset-0 bg-primary/20 pointer-events-none" />
      )}

      {/* Title overlay on hover */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100 pointer-events-none">
        <p className="line-clamp-1 text-[10px] font-medium text-white">
          {clip.title ?? 'Image'}
        </p>
      </div>
    </div>
  );
}
