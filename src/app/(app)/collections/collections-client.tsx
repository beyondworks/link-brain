'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCollections } from '@/lib/hooks/use-collections';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useUpdateCollection, useDeleteCollection } from '@/lib/hooks/use-collection-mutations';
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
import { Plus, FolderOpen, Globe, MoreHorizontal, Pencil, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Collection } from '@/types/database';

const COLOR_PRESETS = [
  '#21DBA4', '#3B82F6', '#8B5CF6', '#EC4899',
  '#F59E0B', '#EF4444', '#10B981', '#6366F1',
];

// ─── Sortable card ─────────────────────────────────────────────────────────────

interface SortableCollectionCardProps {
  col: Collection;
  index: number;
  onEdit: (col: Collection, e: React.MouseEvent) => void;
  onDelete: (col: Collection, e: React.MouseEvent) => void;
}

function SortableCollectionCard({ col, index, onEdit, onDelete }: SortableCollectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.id });

  const staggerDelay = (i: number) => {
    const delays = ['', 'animation-delay-75', 'animation-delay-150', 'animation-delay-200', 'animation-delay-300', 'animation-delay-400'];
    return delays[Math.min(i, delays.length - 1)];
  };

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group card-glow animate-fade-in-up ${staggerDelay(index)} relative overflow-hidden rounded-2xl border border-border bg-card transition-spring`}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 flex h-6 w-6 cursor-grab items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100 hover:bg-muted active:cursor-grabbing focus:outline-none"
        aria-label="드래그하여 순서 변경"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <GripVertical size={14} />
      </button>

      <Link href={`/collections/${col.id}`} className="block p-5 pl-7">
        {/* Color accent line */}
        <div
          className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-70"
          style={{
            background: `linear-gradient(90deg, ${col.color ?? '#21DBA4'}, transparent)`,
          }}
        />
        <div className="flex items-start justify-between mb-3">
          <div className="relative mt-0.5 flex-shrink-0">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: col.color ?? '#21DBA4' }}
            />
            <div
              className="absolute inset-0 rounded-full blur-sm opacity-60"
              style={{ backgroundColor: col.color ?? '#21DBA4' }}
            />
          </div>
          {col.is_public && (
            <Globe size={13} className="text-muted-foreground" />
          )}
        </div>
        <h3 className="font-semibold text-foreground transition-spring group-hover:text-primary">
          {col.name}
        </h3>
        {col.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
            {col.description}
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
              aria-label="컬렉션 옵션"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onSelect={(e) => { onEdit(col, e as unknown as React.MouseEvent); }}
            >
              <Pencil size={13} />
              수정
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              onSelect={(e) => { onDelete(col, e as unknown as React.MouseEvent); }}
            >
              <Trash2 size={13} />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CollectionsClient() {
  const { data: collections, isLoading } = useCollections();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  // Local ordered list for optimistic drag reorder
  const [orderedCollections, setOrderedCollections] = useState<Collection[]>([]);

  useEffect(() => {
    if (collections) setOrderedCollections(collections);
  }, [collections]);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } }),
  );

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Collection | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('collections')
        .insert({ user_id: user.id, name: createName, description: createDescription || null } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setCreateOpen(false);
      setCreateName('');
      setCreateDescription('');
      toast.success('컬렉션이 생성되었습니다');
    },
    onError: () => toast.error('컬렉션 생성 실패'),
  });

  // Batch position update mutation (best-effort — silently ignores missing column)
  const reorderMutation = useMutation({
    mutationFn: async (reordered: Collection[]) => {
      const updates = reordered.map((col, idx) =>
        supabase.from('collections').update({ position: idx } as never).eq('id', col.id),
      );
      await Promise.allSettled(updates);
    },
  });

  const updateCollection = useUpdateCollection();
  const deleteCollection = useDeleteCollection();

  function openEditDialog(col: Collection, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditTarget(col);
    setEditName(col.name);
    setEditDescription(col.description ?? '');
    setEditColor(col.color ?? '#21DBA4');
    setEditOpen(true);
  }

  function openDeleteDialog(col: Collection, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(col);
    setDeleteOpen(true);
  }

  function handleEditSubmit() {
    if (!editTarget || !editName.trim()) return;
    updateCollection.mutate(
      {
        collectionId: editTarget.id,
        name: editName.trim(),
        description: editDescription.trim() || null,
        color: editColor || null,
      },
      { onSuccess: () => { setEditOpen(false); setEditTarget(null); } }
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteCollection.mutate(
      { collectionId: deleteTarget.id },
      {
        onSuccess: () => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        },
      }
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedCollections((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      reorderMutation.mutate(reordered);
      return reordered;
    });
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

  return (
    <div className="relative p-6 lg:p-8">
      {/* Decorative glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glow-orb absolute -right-20 -top-20 h-56 w-56 opacity-25" />
      </div>

      <div className="relative mb-8 flex items-start justify-between animate-blur-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gradient-brand">컬렉션</h1>
          <p className="mt-1 text-sm text-muted-foreground">클립을 주제별로 묶어 정리하세요</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button
            size="sm"
            className="bg-gradient-brand glow-brand-sm hover-scale rounded-xl font-semibold text-white shadow-none transition-spring"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} className="mr-1.5" />
            새 컬렉션
          </Button>
          <DialogContent className="border-gradient bg-glass-heavy rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">새 컬렉션 만들기</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="컬렉션 이름"
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
                onClick={() => createMutation.mutate()}
                disabled={!createName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? '생성 중...' : '만들기'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {orderedCollections.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="컬렉션이 없습니다"
          description="클립을 주제별로 정리해보세요"
          action={{ label: '첫 컬렉션 만들기', onClick: () => setCreateOpen(true) }}
          className="animate-blur-in animation-delay-100"
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedCollections.map((c) => c.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orderedCollections.map((col, i) => (
                <SortableCollectionCard
                  key={col.id}
                  col={col}
                  index={i}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

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

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-gradient bg-glass-heavy rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">컬렉션 삭제</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {deleteTarget && (
                <>
                  <span className="font-medium text-foreground">{deleteTarget.name}</span> 컬렉션을
                  삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </>
              )}
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
    </div>
  );
}
