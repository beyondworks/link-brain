'use client';

import { useState } from 'react';
import { useImageClips, useImageAlbums } from '@/lib/hooks/use-image-albums';
import {
  useCreateImageAlbum,
  useUpdateImageAlbum,
  useDeleteImageAlbum,
} from '@/lib/hooks/use-image-album-mutations';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClipCard } from '@/components/clips/clip-card';
import { Plus, ImageIcon, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { ImageAlbum } from '@/types/database';

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
                className="group card-glow relative overflow-hidden rounded-2xl border border-border bg-card transition-spring"
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
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            전체 이미지
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {imageClips?.map((clip) => (
              <ClipCard key={clip.id} clip={clip} />
            ))}
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
