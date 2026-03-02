'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClips } from '@/lib/hooks/use-clips';
import { useMoveToCollection } from '@/hooks/mutations/use-move-to-collection';
import { toast } from 'sonner';
import { Search, Globe, Loader2 } from 'lucide-react';
import type { ClipData } from '@/types/database';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  /** IDs of clips already in this collection — these are hidden from the list */
  existingClipIds: Set<string>;
}

export function AddClipsToCollectionDialog({
  open,
  onOpenChange,
  collectionId,
  existingClipIds,
}: Props) {
  const [search, setSearch] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useClips({ enabled: open });
  const moveToCollection = useMoveToCollection();

  // Flatten all pages
  const allClips = useMemo<ClipData[]>(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  // Filter out already-in-collection and optimistically-added clips, then apply search
  const filteredClips = useMemo(() => {
    const excluded = new Set([...existingClipIds, ...addedIds]);
    const lower = search.toLowerCase();
    return allClips.filter((clip) => {
      if (excluded.has(clip.id)) return false;
      if (!lower) return true;
      const title = (clip.title ?? '').toLowerCase();
      const url = clip.url.toLowerCase();
      return title.includes(lower) || url.includes(lower);
    });
  }, [allClips, existingClipIds, addedIds, search]);

  function handleAdd(clip: ClipData) {
    // Optimistic: remove from list immediately
    setAddedIds((prev) => new Set([...prev, clip.id]));

    moveToCollection.mutate(
      { clipId: clip.id, collectionId },
      {
        onSuccess: () => {
          toast.success('클립이 컬렉션에 추가되었습니다');
        },
        onError: () => {
          // Rollback optimistic removal
          setAddedIds((prev) => {
            const next = new Set(prev);
            next.delete(clip.id);
            return next;
          });
        },
      }
    );
  }

  function getDomain(url: string) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  function getFaviconUrl(url: string) {
    try {
      const { origin } = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
    } catch {
      return null;
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setSearch('');
        onOpenChange(v);
      }}
    >
      <DialogContent className="border-gradient bg-glass-heavy rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">클립 추가</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            컬렉션에 추가할 클립을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="제목 또는 URL 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl focus-visible:ring-primary/30"
          />
        </div>

        {/* Clip list */}
        <ScrollArea className="h-72">
          {isLoading ? (
            <div className="flex items-center justify-center h-full py-10">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : filteredClips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-muted-foreground">
                {search ? '검색 결과가 없습니다' : '추가할 수 있는 클립이 없습니다'}
              </p>
            </div>
          ) : (
            <ul className="space-y-1 pr-3">
              {filteredClips.map((clip) => {
                const favicon = getFaviconUrl(clip.url);
                const domain = getDomain(clip.url);
                const isPending =
                  moveToCollection.isPending &&
                  moveToCollection.variables?.clipId === clip.id;

                return (
                  <li key={clip.id}>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAdd(clip)}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-hover disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {/* Favicon */}
                      <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-md bg-muted overflow-hidden">
                        {favicon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={favicon}
                            alt=""
                            width={16}
                            height={16}
                            className="h-4 w-4 object-contain"
                          />
                        ) : (
                          <Globe size={12} className="text-muted-foreground" />
                        )}
                      </span>

                      {/* Text */}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground leading-tight">
                          {clip.title ?? domain}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground mt-0.5">
                          {domain}
                        </span>
                      </span>

                      {isPending && (
                        <Loader2 size={14} className="flex-shrink-0 animate-spin text-muted-foreground" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
