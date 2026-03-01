'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SHORTCUT_GROUPS = [
  {
    title: '일반',
    shortcuts: [
      { keys: ['?'], description: '단축키 도움말' },
      { keys: ['⌘', 'K'], description: '검색 (Omni-Search)' },
      { keys: ['N'], description: '새 클립 추가' },
    ],
  },
  {
    title: '내비게이션',
    shortcuts: [
      { keys: ['G', 'H'], description: '대시보드' },
      { keys: ['G', 'F'], description: '즐겨찾기' },
      { keys: ['G', 'C'], description: '컬렉션' },
      { keys: ['G', 'A'], description: '아카이브' },
      { keys: ['G', 'S'], description: 'Content Studio' },
      { keys: ['G', 'I'], description: '인사이트' },
      { keys: ['G', 'G'], description: '지식 그래프' },
    ],
  },
  {
    title: '클립 목록',
    shortcuts: [
      { keys: ['J'], description: '다음 클립' },
      { keys: ['K'], description: '이전 클립' },
      { keys: ['Enter'], description: '클립 열기' },
      { keys: ['F'], description: '즐겨찾기 토글' },
      { keys: ['E'], description: '아카이브' },
      { keys: ['O'], description: '원본 링크 열기' },
    ],
  },
  {
    title: '뷰 모드',
    shortcuts: [
      { keys: ['V', 'G'], description: '그리드 뷰' },
      { keys: ['V', 'L'], description: '리스트 뷰' },
      { keys: ['V', 'H'], description: '헤드라인 뷰' },
    ],
  },
];

export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // ? 키로 토글 (input/textarea에서는 무시)
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>키보드 단축키</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && (
                            <span className="mx-0.5 text-muted-foreground">
                              +
                            </span>
                          )}
                          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
