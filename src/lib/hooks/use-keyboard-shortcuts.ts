'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';

/**
 * Global keyboard shortcuts (vim-style navigation).
 * Disabled when an input/textarea/contenteditable is focused.
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const { setViewMode, toggleSidebar, openModal } = useUIStore();

  useEffect(() => {
    let pendingKey: string | null = null;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    function clearPending() {
      pendingKey = null;
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    }

    function isInputFocused(): boolean {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if ((el as HTMLElement).isContentEditable) return true;
      return false;
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Skip when typing in inputs
      if (isInputFocused()) return;

      // Two-key combos: g+h (home), g+f (favorites), g+s (settings), g+a (archive)
      if (pendingKey === 'g') {
        clearPending();
        switch (e.key) {
          case 'h':
            e.preventDefault();
            router.push('/dashboard');
            return;
          case 'f':
            e.preventDefault();
            router.push('/favorites');
            return;
          case 's':
            e.preventDefault();
            router.push('/settings');
            return;
          case 'a':
            e.preventDefault();
            router.push('/archive');
            return;
          case 'e':
            e.preventDefault();
            router.push('/explore');
            return;
        }
      }

      // Start g-combo
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        pendingKey = 'g';
        pendingTimer = setTimeout(clearPending, 500);
        return;
      }

      // Single key shortcuts
      switch (e.key) {
        case '1':
          e.preventDefault();
          setViewMode('grid');
          break;
        case '2':
          e.preventDefault();
          setViewMode('list');
          break;
        case '3':
          e.preventDefault();
          setViewMode('headlines');
          break;
        case 'n':
          e.preventDefault();
          openModal('addClip');
          break;
        case '[':
          e.preventDefault();
          toggleSidebar();
          break;
        case '?':
          e.preventDefault();
          openModal('shortcuts');
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, setViewMode, toggleSidebar, openModal]);
}
