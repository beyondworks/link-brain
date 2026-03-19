'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClips } from '@/lib/hooks/use-clips';
import { useCategories } from '@/lib/hooks/use-categories';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { PLATFORMS, PLATFORM_LABELS_EN } from '@/config/constants';
import type { ClipPlatform } from '@/types/database';
import { StudioClipPickerItem } from './studio-clip-picker-item';
import { StudioClipPreview } from './studio-clip-preview';

interface StudioClipPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  onConfirm: (ids: Set<string>) => void;
}

const ALL_VALUE = '__all__';

export function StudioClipPickerDialog({
  open,
  onOpenChange,
  selectedIds,
  onConfirm,
}: StudioClipPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<Set<string>>(new Set());
  const [previewClipId, setPreviewClipId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPendingSelection(new Set(selectedIds));
      setSearchQuery('');
      setCategoryFilter(null);
      setPlatformFilter(null);
      setPreviewClipId(null);
    }
  }, [open, selectedIds]);

  const { data: categories } = useCategories();

  const { data, isLoading, error } = useClips({
    search: debouncedSearch || undefined,
    filters: {
      categoryId: categoryFilter ?? undefined,
      platform: (platformFilter as ClipPlatform) ?? undefined,
    },
    enabled: open,
  });

  const allClips = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data]
  );

  const toggleClip = useCallback((id: string) => {
    setPendingSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handlePreview = useCallback((id: string) => {
    setPreviewClipId((prev) => (prev === id ? null : id));
  }, []);

  const handleConfirm = () => {
    onConfirm(pendingSelection);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-4xl flex flex-col',
          'max-h-[85vh]'
        )}
        showCloseButton
      >
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>소스 클립 선택</DialogTitle>
            {pendingSelection.size > 0 && (
              <Badge
                variant="secondary"
                className="rounded-lg bg-primary/10 text-primary text-xs"
              >
                {pendingSelection.size}개 선택
              </Badge>
            )}
          </div>
          <DialogDescription>
            콘텐츠 생성에 사용할 클립을 선택하세요
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 sm:flex-row">
          {/* Left panel — list */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="클립 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select
                value={categoryFilter ?? ALL_VALUE}
                onValueChange={(v) => setCategoryFilter(v === ALL_VALUE ? null : v)}
              >
                <SelectTrigger className="rounded-xl flex-1">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value={ALL_VALUE}>전체 카테고리</SelectItem>
                  {(categories ?? []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={platformFilter ?? ALL_VALUE}
                onValueChange={(v) => setPlatformFilter(v === ALL_VALUE ? null : v)}
              >
                <SelectTrigger className="rounded-xl flex-1">
                  <SelectValue placeholder="플랫폼" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value={ALL_VALUE}>전체 플랫폼</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PLATFORM_LABELS_EN[p] ?? p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clip list */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg shimmer" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex h-32 items-center justify-center">
                  <p className="text-sm text-destructive">
                    클립을 불러오지 못했습니다
                  </p>
                </div>
              ) : allClips.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
                  <Link2 size={20} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    검색 결과가 없습니다
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    다른 키워드나 필터를 시도해 보세요
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {allClips.map((clip) => (
                    <StudioClipPickerItem
                      key={clip.id}
                      clip={clip}
                      isSelected={pendingSelection.has(clip.id)}
                      onToggle={toggleClip}
                      onPreview={handlePreview}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right panel — preview */}
          <div className="hidden sm:flex sm:w-[40%] sm:shrink-0 sm:flex-col rounded-xl border border-border bg-muted/10 p-4">
            <StudioClipPreview clipId={previewClipId} />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-gradient-brand glow-brand rounded-xl font-semibold shadow-none"
          >
            {pendingSelection.size > 0
              ? `${pendingSelection.size}개 선택 완료`
              : '선택 완료'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
