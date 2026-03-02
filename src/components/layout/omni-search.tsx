'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, FolderOpen, Tag } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useUIStore } from '@/stores/ui-store';
import { supabase } from '@/lib/supabase/client';
import { useSupabase } from '@/components/providers/supabase-provider';

interface SearchResult {
  id: string;
  title: string;
  type: 'clip' | 'collection' | 'tag';
}

export function OmniSearch() {
  const { omniSearchOpen, setOmniSearchOpen } = useUIStore();
  const { user } = useSupabase();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [clips, setClips] = useState<SearchResult[]>([]);
  const [collections, setCollections] = useState<SearchResult[]>([]);
  const [tags, setTags] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Cmd+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOmniSearchOpen(!omniSearchOpen);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [omniSearchOpen, setOmniSearchOpen]);

  // Reset on close
  useEffect(() => {
    if (!omniSearchOpen) {
      setQuery('');
      setClips([]);
      setCollections([]);
      setTags([]);
    }
  }, [omniSearchOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !user) {
      setClips([]);
      setCollections([]);
      setTags([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const searchTerm = `%${query.trim()}%`;

      const [clipRes, colRes, tagRes] = await Promise.all([
        supabase
          .from('clips')
          .select('id, title')
          .eq('user_id', user.id)
          .or(`title.ilike.${searchTerm},summary.ilike.${searchTerm}`)
          .limit(5),
        supabase
          .from('collections')
          .select('id, name')
          .eq('user_id', user.id)
          .ilike('name', searchTerm)
          .limit(3),
        supabase
          .from('tags')
          .select('id, name')
          .ilike('name', searchTerm)
          .limit(5),
      ]);

      setClips(
        (clipRes.data ?? []).map((c) => ({
          id: c.id,
          title: c.title ?? '제목 없음',
          type: 'clip' as const,
        }))
      );
      setCollections(
        (colRes.data ?? []).map((c) => ({
          id: c.id,
          title: c.name,
          type: 'collection' as const,
        }))
      );
      setTags(
        (tagRes.data ?? []).map((t) => ({
          id: t.id,
          title: t.name,
          type: 'tag' as const,
        }))
      );
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOmniSearchOpen(false);
      if (result.type === 'clip') {
        router.push(`/clip/${result.id}`);
      } else if (result.type === 'collection') {
        router.push(`/collections/${result.id}`);
      } else if (result.type === 'tag') {
        router.push(`/dashboard?tag=${encodeURIComponent(result.title)}`);
      }
    },
    [router, setOmniSearchOpen]
  );

  const hasResults = clips.length > 0 || collections.length > 0 || tags.length > 0;
  const hasQuery = query.trim().length > 0;

  return (
    <CommandDialog
      open={omniSearchOpen}
      onOpenChange={setOmniSearchOpen}
      title="검색"
      description="클립, 컬렉션, 태그를 검색하세요"
      showCloseButton={false}
      className="border-gradient bg-glass-heavy animate-scale-in overflow-hidden rounded-2xl shadow-elevated backdrop-blur-2xl"
    >
      <CommandInput
        placeholder="클립, 컬렉션, 태그 검색..."
        value={query}
        onValueChange={setQuery}
        className="border-0 text-lg focus:ring-0 placeholder:text-muted-foreground/50"
      />

      {/* Hint chips */}
      <div className="flex items-center gap-1.5 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent px-3 py-2">
        {[
          { prefix: '>', label: '커맨드' },
          { prefix: '#', label: '태그' },
          { prefix: '@', label: '컬렉션' },
        ].map((hint) => (
          <span
            key={hint.prefix}
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-spring hover:border-primary/30 hover:text-primary"
          >
            <span className="text-primary/70">{hint.prefix}</span>
            {hint.label}
          </span>
        ))}
        <kbd className="ml-auto rounded-lg border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <CommandList className="max-h-80">
        {hasQuery && !hasResults && !isSearching && (
          <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
            검색 결과가 없습니다.
          </CommandEmpty>
        )}

        {isSearching && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            검색 중...
          </div>
        )}

        {!hasQuery && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            검색어를 입력하세요
          </div>
        )}

        {clips.length > 0 && (
          <CommandGroup heading="클립">
            {clips.map((clip) => (
              <CommandItem
                key={clip.id}
                value={clip.title}
                onSelect={() => handleSelect(clip)}
                className="hover-lift mx-1 my-0.5 cursor-pointer rounded-xl transition-spring"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="truncate text-sm">{clip.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {clips.length > 0 && collections.length > 0 && (
          <CommandSeparator className="bg-border/40" />
        )}

        {collections.length > 0 && (
          <CommandGroup heading="컬렉션">
            {collections.map((col) => (
              <CommandItem
                key={col.id}
                value={col.title}
                onSelect={() => handleSelect(col)}
                className="hover-lift mx-1 my-0.5 cursor-pointer rounded-xl transition-spring"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/15 to-blue-500/5 ring-1 ring-blue-500/10">
                  <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <span className="truncate text-sm">{col.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(clips.length > 0 || collections.length > 0) && tags.length > 0 && (
          <CommandSeparator className="bg-border/40" />
        )}

        {tags.length > 0 && (
          <CommandGroup heading="태그">
            {tags.map((tag) => (
              <CommandItem
                key={tag.id}
                value={tag.title}
                onSelect={() => handleSelect(tag)}
                className="hover-lift mx-1 my-0.5 cursor-pointer rounded-xl transition-spring"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="truncate text-sm">{tag.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
