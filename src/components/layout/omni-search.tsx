'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  FolderOpen,
  Tag,
  Clock,
  X,
  Plus,
  Settings,
  Download,
  FolderPlus,
} from 'lucide-react';
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
import { exportClips } from '@/lib/utils/export';

const RECENT_SEARCHES_KEY = 'linkbrain-recent-searches';
const MAX_RECENT = 5;

function loadRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function saveRecentSearches(terms: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(terms));
}

function addRecentSearch(term: string): void {
  const trimmed = term.trim();
  if (!trimmed) return;
  const current = loadRecentSearches();
  const deduped = current.filter((t) => t !== trimmed);
  const next = [trimmed, ...deduped].slice(0, MAX_RECENT);
  saveRecentSearches(next);
}

interface SearchResult {
  id: string;
  title: string;
  type: 'clip' | 'collection' | 'tag';
}

export function OmniSearch() {
  const { omniSearchOpen, setOmniSearchOpen, openModal } = useUIStore();
  const { user } = useSupabase();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [clips, setClips] = useState<SearchResult[]>([]);
  const [collections, setCollections] = useState<SearchResult[]>([]);
  const [tags, setTags] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches when dialog opens
  useEffect(() => {
    if (omniSearchOpen) {
      setRecentSearches(loadRecentSearches());
    }
  }, [omniSearchOpen]);

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
        (clipRes.data ?? []).map((c: { id: string; title: string | null }) => ({
          id: c.id,
          title: c.title ?? '제목 없음',
          type: 'clip' as const,
        }))
      );
      setCollections(
        (colRes.data ?? []).map((c: { id: string; name: string }) => ({
          id: c.id,
          title: c.name,
          type: 'collection' as const,
        }))
      );
      setTags(
        (tagRes.data ?? []).map((t: { id: string; name: string }) => ({
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
      addRecentSearch(query.trim());
      setRecentSearches(loadRecentSearches());
      setOmniSearchOpen(false);
      if (result.type === 'clip') {
        router.push(`/clip/${result.id}`);
      } else if (result.type === 'collection') {
        router.push(`/collections/${result.id}`);
      } else if (result.type === 'tag') {
        router.push(`/dashboard?tag=${encodeURIComponent(result.title)}`);
      }
    },
    [query, router, setOmniSearchOpen]
  );

  const handleRecentSelect = useCallback(
    (term: string) => {
      setQuery(term);
    },
    []
  );

  const handleClearRecent = useCallback(() => {
    saveRecentSearches([]);
    setRecentSearches([]);
  }, []);

  const handleQuickAction = useCallback(
    (action: 'add-clip' | 'new-collection' | 'settings' | 'export') => {
      setOmniSearchOpen(false);
      switch (action) {
        case 'add-clip':
          openModal('add-clip');
          break;
        case 'new-collection':
          router.push('/collections');
          break;
        case 'settings':
          router.push('/settings');
          break;
        case 'export':
          void exportClips('json');
          break;
      }
    },
    [openModal, router, setOmniSearchOpen]
  );

  const hasResults = clips.length > 0 || collections.length > 0 || tags.length > 0;
  const hasQuery = query.trim().length > 0;
  const showEmpty = hasQuery && !hasResults && !isSearching;

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
        {showEmpty && (
          <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
            검색 결과가 없습니다.
          </CommandEmpty>
        )}

        {isSearching && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            검색 중...
          </div>
        )}

        {/* Empty state: recent searches + quick actions */}
        {!hasQuery && (
          <>
            {recentSearches.length > 0 && (
              <CommandGroup
                heading={
                  <div className="flex items-center justify-between">
                    <span>최근 검색</span>
                    <button
                      onClick={handleClearRecent}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                      기록 지우기
                    </button>
                  </div>
                }
              >
                {recentSearches.map((term) => (
                  <CommandItem
                    key={term}
                    value={`recent-${term}`}
                    onSelect={() => handleRecentSelect(term)}
                    className="hover-lift mx-1 my-0.5 cursor-pointer rounded-xl transition-spring"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-border/40">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="truncate text-sm">{term}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {recentSearches.length > 0 && (
              <CommandSeparator className="bg-border/40" />
            )}

            <CommandGroup heading="빠른 작업">
              <CommandItem
                value="quick-add-clip"
                onSelect={() => handleQuickAction('add-clip')}
                className="hover-lift mx-1 my-0.5 cursor-pointer rounded-xl transition-spring"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
                  <Plus className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="flex-1 text-sm">새 클립 추가</span>
                <kbd className="rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  N
                </kbd>
              </CommandItem>

              <CommandItem
                value="quick-new-collection"
                onSelect={() => handleQuickAction('new-collection')}
                className="hover-lift mx-1 my-0.5 cursor-pointer rounded-xl transition-spring"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/15 to-blue-500/5 ring-1 ring-blue-500/10">
                  <FolderPlus className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <span className="flex-1 text-sm">새 컬렉션 만들기</span>
              </CommandItem>

              <CommandItem
                value="quick-settings"
                onSelect={() => handleQuickAction('settings')}
                className="hover-lift mx-1 my-0.5 cursor-pointer rounded-xl transition-spring"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-border/40">
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="flex-1 text-sm">설정</span>
                <kbd className="rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  ,
                </kbd>
              </CommandItem>

              <CommandItem
                value="quick-export"
                onSelect={() => handleQuickAction('export')}
                className="hover-lift mx-1 my-0.5 cursor-pointer rounded-xl transition-spring"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-border/40">
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="flex-1 text-sm">클립 내보내기</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {/* Search results */}
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
