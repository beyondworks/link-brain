'use client';

import { useEffect } from 'react';
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

const RECENT_ITEMS = [
  { id: '1', title: '최근 본 클립이 여기에 표시됩니다', type: 'clip' as const },
];

const COLLECTION_ITEMS = [
  { id: '1', title: '컬렉션이 여기에 표시됩니다', type: 'collection' as const },
];

const TAG_ITEMS = [
  { id: '1', title: '태그가 여기에 표시됩니다', type: 'tag' as const },
];

export function OmniSearch() {
  const { omniSearchOpen, setOmniSearchOpen } = useUIStore();

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

  return (
    <CommandDialog
      open={omniSearchOpen}
      onOpenChange={setOmniSearchOpen}
      title="검색"
      description="클립, 컬렉션, 태그를 검색하세요"
      showCloseButton={false}
      className="border-gradient bg-glass-heavy animate-scale-in overflow-hidden rounded-2xl shadow-elevated backdrop-blur-2xl"
    >
      {/* Search input — enlarged */}
      <CommandInput
        placeholder="검색어를 입력하세요..."
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
        <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
          검색 결과가 없습니다.
        </CommandEmpty>

        <CommandGroup heading="최근 클립">
          {RECENT_ITEMS.map((item) => (
            <CommandItem
              key={item.id}
              value={item.title}
              className="hover-lift mx-1 my-0.5 cursor-pointer rounded-xl transition-spring"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
                <FileText className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm">{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator className="bg-border/40" />

        <CommandGroup heading="컬렉션">
          {COLLECTION_ITEMS.map((item) => (
            <CommandItem
              key={item.id}
              value={item.title}
              className="hover-lift mx-1 my-0.5 cursor-pointer rounded-xl transition-spring"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/15 to-blue-500/5 ring-1 ring-blue-500/10">
                <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <span className="text-sm">{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator className="bg-border/40" />

        <CommandGroup heading="태그">
          {TAG_ITEMS.map((item) => (
            <CommandItem
              key={item.id}
              value={item.title}
              className="hover-lift mx-1 my-0.5 cursor-pointer rounded-xl transition-spring"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10">
                <Tag className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm">{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
