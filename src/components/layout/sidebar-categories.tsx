'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreHorizontal, Pencil, Palette, Trash2 } from 'lucide-react';
import { useCategories } from '@/lib/hooks/use-categories';
import { useUIStore } from '@/stores/ui-store';
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/lib/hooks/use-category-mutations';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/database';

const PRESET_COLORS = [
  '#21DBA4',
  '#3B82F6',
  '#EF4444',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
];

interface EditState {
  id: string;
  mode: 'name' | 'color';
  name: string;
  color: string;
}

function ColorPicker({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            'h-4 w-4 rounded-full transition-transform hover:scale-110',
            selected === c && 'ring-2 ring-offset-1 ring-offset-background ring-foreground/40'
          )}
          style={{ backgroundColor: c }}
          aria-label={c}
        />
      ))}
    </div>
  );
}

export function SidebarCategories() {
  const router = useRouter();
  const { data: categories = [], isLoading } = useCategories();
  const { filters, setFilter } = useUIStore();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [edit, setEdit] = useState<EditState | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  function handleCategoryClick(id: string) {
    if (filters.categoryId === id) {
      setFilter('categoryId', null);
    } else {
      setFilter('categoryId', id);
      router.push('/dashboard');
    }
  }

  function startAdding() {
    setAdding(true);
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
    setTimeout(() => addInputRef.current?.focus(), 0);
  }

  function cancelAdding() {
    setAdding(false);
    setNewName('');
  }

  async function submitAdd() {
    const name = newName.trim();
    if (!name) { cancelAdding(); return; }
    await createCategory.mutateAsync({ name, color: newColor });
    cancelAdding();
  }

  function handleAddKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); void submitAdd(); }
    if (e.key === 'Escape') cancelAdding();
  }

  function startEditName(cat: Category) {
    setEdit({ id: cat.id, mode: 'name', name: cat.name, color: cat.color ?? PRESET_COLORS[0] });
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  function startEditColor(cat: Category) {
    setEdit({ id: cat.id, mode: 'color', name: cat.name, color: cat.color ?? PRESET_COLORS[0] });
  }

  async function submitEdit() {
    if (!edit) return;
    await updateCategory.mutateAsync({ id: edit.id, name: edit.name, color: edit.color });
    setEdit(null);
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); void submitEdit(); }
    if (e.key === 'Escape') setEdit(null);
  }

  async function handleDelete(cat: Category) {
    if (filters.categoryId === cat.id) setFilter('categoryId', null);
    await deleteCategory.mutateAsync({ id: cat.id });
  }

  return (
    <div className="mt-6">
      {/* Section header */}
      <div className="mb-2 flex items-center px-3">
        <p className="flex-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
          카테고리
        </p>
        <button
          type="button"
          onClick={startAdding}
          className="rounded-md p-0.5 text-muted-foreground/50 transition-smooth hover:bg-accent hover:text-foreground"
          aria-label="카테고리 추가"
        >
          <Plus size={13} />
        </button>
      </div>

      <ul className="space-y-0.5">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </li>
            ))}
          </>
        ) : (
          categories.map((cat) => {
            const isActive = filters.categoryId === cat.id;
            const isEditing = edit?.id === cat.id;

            return (
              <li key={cat.id}>
                {isEditing && edit.mode === 'name' ? (
                  <div className="flex flex-col gap-1 px-3 py-1.5">
                    <input
                      ref={editInputRef}
                      value={edit.name}
                      onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                      onKeyDown={handleEditKeyDown}
                      onBlur={() => void submitEdit()}
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>
                ) : isEditing && edit.mode === 'color' ? (
                  <div className="flex flex-col gap-1.5 px-3 py-1.5">
                    <ColorPicker
                      selected={edit.color}
                      onChange={(c) => {
                        void updateCategory.mutateAsync({ id: edit.id, color: c });
                        setEdit(null);
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-spring cursor-pointer',
                      isActive
                        ? 'bg-gradient-brand-subtle font-semibold text-primary'
                        : 'font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                    )}
                    onClick={() => handleCategoryClick(cat.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleCategoryClick(cat.id)}
                  >
                    {/* Active state shown via bg/text color */}
                    <span
                      className="h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color ?? '#21DBA4' }}
                    />
                    <span className="flex-1 truncate">{cat.name}</span>
                    {(() => {
                      const clips = (cat as unknown as Record<string, unknown>).clips;
                      const count = Array.isArray(clips) ? (clips[0] as Record<string, number> | undefined)?.count ?? 0 : 0;
                      return count > 0 ? (
                        <span className="ml-auto mr-1 text-[10px] tabular-nums text-muted-foreground/50">
                          {count}
                        </span>
                      ) : null;
                    })()}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="ml-auto flex rounded-md p-0.5 text-muted-foreground/50 transition-smooth hover:bg-accent hover:text-foreground lg:opacity-0 lg:group-hover:opacity-100"
                          aria-label="카테고리 옵션"
                        >
                          <MoreHorizontal size={13} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" side="right" className="w-40">
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); startEditName(cat); }}
                          className="flex items-center gap-2"
                        >
                          <Pencil size={13} />
                          이름 변경
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); startEditColor(cat); }}
                          className="flex items-center gap-2"
                        >
                          <Palette size={13} />
                          색상 변경
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); void handleDelete(cat); }}
                          className="flex items-center gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 size={13} />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </li>
            );
          })
        )}

        {/* Inline add form */}
        {adding && (
          <li className="flex flex-col gap-1.5 px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <input
                ref={addInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="카테고리 이름"
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
              />
              <button
                type="button"
                onClick={() => void submitAdd()}
                disabled={!newName.trim() || createCategory.isPending}
                className="flex-shrink-0 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground transition-smooth hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none"
              >
                생성
              </button>
            </div>
            <ColorPicker selected={newColor} onChange={setNewColor} />
          </li>
        )}
      </ul>
    </div>
  );
}
