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
    >
      <CommandInput placeholder="검색어를 입력하세요..." />
      <div className="flex gap-2 border-b border-border px-3 py-2">
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          &gt; 커맨드
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          # 태그
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          @ 컬렉션
        </span>
      </div>
      <CommandList>
        <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>

        <CommandGroup heading="최근 클립">
          {RECENT_ITEMS.map((item) => (
            <CommandItem key={item.id} value={item.title}>
              <FileText className="text-muted-foreground" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="컬렉션">
          {COLLECTION_ITEMS.map((item) => (
            <CommandItem key={item.id} value={item.title}>
              <FolderOpen className="text-muted-foreground" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="태그">
          {TAG_ITEMS.map((item) => (
            <CommandItem key={item.id} value={item.title}>
              <Tag className="text-muted-foreground" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
