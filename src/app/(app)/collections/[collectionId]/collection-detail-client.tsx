'use client';

import { useState } from 'react';
import { useCollection, useCollectionClips } from '@/lib/hooks/use-collections';
import {
  useUpdateCollection,
  useDeleteCollection,
  useRemoveClipFromCollection,
} from '@/lib/hooks/use-collection-mutations';
import { ClipCard } from '@/components/clips/clip-card';
import { ClipRow } from '@/components/clips/clip-row';
import { ClipCardSkeleton } from '@/components/clips/clip-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { FolderOpen, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import type { ClipData } from '@/types/database';
import { AddClipsToCollectionDialog } from '@/components/collections/add-clips-to-collection-dialog';
import { CollectionShareButton } from '@/components/collections/collection-share-button';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

interface Props {
  collectionId: string;
}

const COLOR_PRESETS = [
  '#21DBA4', '#3B82F6', '#8B5CF6', '#EC4899',
  '#F59E0B', '#EF4444', '#10B981', '#6366F1',
];

export function CollectionDetailClient({ collectionId }: Props) {
  const { data: collection, isLoading: collectionLoading } = useCollection(collectionId);
  const { data: clips, isLoading: clipsLoading } = useCollectionClips(collectionId);

  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();
  const removeClip = useRemoveClipFromCollection();
  const viewMode = useUIStore((s) => s.viewMode);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addClipsOpen, setAddClipsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');

  function openEditDialog() {
    if (!collection) return;
    setEditName(collection.name);
    setEditDescription(collection.description ?? '');
    setEditColor(collection.color ?? '#21DBA4');
    setEditOpen(true);
  }

  function handleEditSubmit() {
    if (!editName.trim()) return;
    updateCollection.mutate(
      {
        collectionId,
        name: editName.trim(),
        description: editDescription.trim() || null,
        color: editColor || null,
      },
      { onSuccess: () => setEditOpen(false) }
    );
  }

  function handleDelete() {
    deleteCollection.mutate({ collectionId }, { onSuccess: () => setDeleteOpen(false) });
  }

  if (collectionLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <Skeleton className="mb-2 h-8 w-48 rounded-xl shimmer" />
          <Skeleton className="h-4 w-72 rounded-lg shimmer" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <ClipCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex flex-col items-center justify-center p-6 lg:p-8 py-24">
        <div className="mb-4 rounded-xl bg-muted p-4 w-fit">
          <FolderOpen size={32} className="text-muted-foreground" />
        </div>
        <p className="text-base font-semibold text-foreground">컬렉션을 찾을 수 없습니다</p>
      </div>
    );
  }

  const validClips = (clips ?? []) as unknown as ClipData[];
  const accentColor = collection.color ?? '#21DBA4';

  return (
    <div className="relative">
      {/* Breadcrumb */}
      <div className="px-6 pt-5 pb-0 lg:px-8">
        <Breadcrumbs
          items={[
            { label: '컬렉션', href: '/collections' },
            { label: collection.name, href: undefined },
          ]}
        />
      </div>

      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-mesh px-6 py-8 lg:px-8 lg:py-10">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-25"
          style={{ backgroundColor: accentColor }}
        />
        <div
          className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full blur-2xl opacity-15"
          style={{ backgroundColor: accentColor }}
        />
        <div
          className="absolute inset-x-0 top-0 h-0.5"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
        />

        <div className="relative animate-blur-in flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                <div
                  className="absolute inset-0 rounded-full blur-md opacity-70"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {collection.name}
              </h1>
            </div>
            {collection.description && (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed pl-7">
                {collection.description}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              className="rounded-xl gap-1.5 bg-gradient-brand glow-brand font-semibold text-white shadow-none transition-spring"
              onClick={() => setAddClipsOpen(true)}
            >
              <Plus size={14} />
              클립 추가
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5 border-border/60 hover:border-border"
              onClick={openEditDialog}
            >
              <Pencil size={14} />
              수정
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5 border-border/60 hover:border-destructive/60 hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={14} />
              삭제
            </Button>
            <CollectionShareButton
              collectionId={collectionId}
              initialShareToken={(collection as unknown as { share_token?: string | null }).share_token}
            />
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-6 lg:p-8">
        {clipsLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <ClipCardSkeleton key={i} />)}
          </div>
        ) : validClips.length === 0 ? (
          <div className="relative flex flex-col items-center justify-center py-24 animate-blur-in animation-delay-100">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-20"
              style={{ backgroundColor: accentColor }}
            />
            <div
              className="relative mb-4 rounded-2xl p-5 ring-1 ring-white/10"
              style={{
                background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}08)`,
              }}
            >
              <FolderOpen size={32} className="animate-float" style={{ color: accentColor }} />
            </div>
            <p className="relative text-base font-semibold text-foreground">
              이 컬렉션에 클립이 없습니다
            </p>
            <p className="relative mt-1.5 text-sm text-muted-foreground">
              클립을 추가해 컬렉션을 채워보세요
            </p>
          </div>
        ) : (
          <div
            className={cn(
              'animate-blur-in animation-delay-100',
              viewMode === 'list'
                ? 'flex flex-col'
                : 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4',
            )}
          >
            {validClips.map((clip) => (
              <div key={clip.id} className="relative group">
                {viewMode === 'list' ? (
                  <ClipRow clip={clip} />
                ) : (
                  <ClipCard clip={clip} />
                )}
                {/* Remove button — appears on hover */}
                <button
                  type="button"
                  aria-label="컬렉션에서 제거"
                  className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-0 ring-1 ring-border transition-opacity group-hover:opacity-100 hover:text-destructive hover:ring-destructive/50 disabled:pointer-events-none"
                  disabled={removeClip.isPending}
                  onClick={() =>
                    removeClip.mutate({ clipId: clip.id, collectionId })
                  }
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-gradient bg-glass-heavy rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">컬렉션 수정</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              컬렉션의 이름, 설명, 색상을 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="컬렉션 이름"
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
            {/* Color picker */}
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
              disabled={updateCollection.isPending}
            >
              취소
            </Button>
            <Button
              className="bg-gradient-brand glow-brand rounded-xl font-semibold shadow-none transition-spring"
              onClick={handleEditSubmit}
              disabled={!editName.trim() || updateCollection.isPending}
            >
              {updateCollection.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-gradient bg-glass-heavy rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">컬렉션 삭제</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{collection.name}</span> 컬렉션을
              삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteCollection.isPending}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={handleDelete}
              disabled={deleteCollection.isPending}
            >
              {deleteCollection.isPending ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Clips Dialog */}
      <AddClipsToCollectionDialog
        open={addClipsOpen}
        onOpenChange={setAddClipsOpen}
        collectionId={collectionId}
        existingClipIds={new Set(validClips.map((c) => c.id))}
      />
    </div>
  );
}
