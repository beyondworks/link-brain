'use client';

import { useState, useMemo } from 'react';
import { Loader2, Plus, Search, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTags, useCreateTag } from '@/lib/hooks/use-tags';
import { useBulkAddTags } from '@/lib/hooks/use-bulk-actions';

interface BulkTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clipIds: string[];
  onSuccess?: () => void;
}

export function BulkTagDialog({
  open,
  onOpenChange,
  clipIds,
  onSuccess,
}: BulkTagDialogProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [newTagName, setNewTagName] = useState('');

  const { data: tags = [], isLoading: tagsLoading } = useTags();
  const createTag = useCreateTag();
  const bulkAddTags = useBulkAddTags();

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const q = searchQuery.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, searchQuery]);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;
    try {
      const tag = await createTag.mutateAsync(name);
      setSelectedTagIds((prev) => new Set([...prev, tag.id]));
      setNewTagName('');
    } catch {
      // useCreateTag 내부에서 에러 처리됨
    }
  }

  async function handleApply() {
    if (selectedTagIds.size === 0 || clipIds.length === 0) return;
    await bulkAddTags.mutateAsync({
      clipIds,
      tagIds: Array.from(selectedTagIds),
    });
    setSelectedTagIds(new Set());
    setSearchQuery('');
    onOpenChange(false);
    onSuccess?.();
  }

  function handleClose(open: boolean) {
    if (!open) {
      setSelectedTagIds(new Set());
      setSearchQuery('');
      setNewTagName('');
    }
    onOpenChange(open);
  }

  const isPending = bulkAddTags.isPending || createTag.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            태그 추가
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          선택한 클립 <span className="font-semibold text-foreground">{clipIds.length}개</span>에
          태그를 추가합니다.
        </p>

        {/* 태그 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="태그 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* 태그 목록 */}
        <div className="max-h-48 overflow-y-auto rounded-xl border border-border/60 bg-surface p-1">
          {tagsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTags.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {searchQuery ? '검색 결과가 없습니다.' : '태그가 없습니다.'}
            </p>
          ) : (
            filteredTags.map((tag) => {
              const checked = selectedTagIds.has(tag.id);
              return (
                <label
                  key={tag.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent',
                    checked && 'bg-primary/5'
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleTag(tag.id)}
                    id={`tag-${tag.id}`}
                  />
                  <Label
                    htmlFor={`tag-${tag.id}`}
                    className="cursor-pointer font-normal"
                  >
                    {tag.name}
                  </Label>
                </label>
              );
            })
          )}
        </div>

        {/* 새 태그 추가 */}
        <div className="flex gap-2">
          <Input
            placeholder="새 태그 이름..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleCreateTag();
              }
            }}
            disabled={createTag.isPending}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleCreateTag()}
            disabled={!newTagName.trim() || createTag.isPending}
            className="shrink-0"
            aria-label="태그 생성"
          >
            {createTag.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleClose(false)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            onClick={() => void handleApply()}
            disabled={selectedTagIds.size === 0 || isPending}
          >
            {bulkAddTags.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                적용 중...
              </>
            ) : (
              `태그 ${selectedTagIds.size}개 적용`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
