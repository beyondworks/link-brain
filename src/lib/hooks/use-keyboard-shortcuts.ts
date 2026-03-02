'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';

/**
 * Global keyboard shortcuts (vim-style navigation).
 * Disabled when an input/textarea/contenteditable is focused.
 *
 * Cmd+K: Open omni-search (handled by OmniSearch component)
 * Cmd+N / Ctrl+N: Open add clip dialog
 * N: Open add clip dialog (no modifier)
 * Escape: Close active modal or peek panel
 * 1/2/3: Switch view mode (grid/list/headlines)
 * [: Toggle sidebar
 * ?: Open shortcuts modal
 * G then D: Go to dashboard
 * G then H: Go to dashboard (alias)
 * G then S: Go to studio
 * G then I: Go to insights
 * G then F: Go to favorites
 * G then A: Go to archive
 * G then C: Go to collections
 * G then E: Go to explore
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const setViewMode = useUIStore((s) => s.setViewMode);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const activeModal = useUIStore((s) => s.activeModal);
  const closeClipPeek = useUIStore((s) => s.closeClipPeek);
  const peekClipId = useUIStore((s) => s.peekClipId);

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

      // Cmd/Ctrl+N: Open add clip dialog
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        openModal('addClip');
        return;
      }

      // Escape: Close modal or peek panel
      if (e.key === 'Escape') {
        if (activeModal) {
          closeModal();
          return;
        }
        if (peekClipId) {
          closeClipPeek();
          return;
        }
      }

      // Two-key combos: g+<key> navigation
      if (pendingKey === 'g') {
        clearPending();
        switch (e.key) {
          case 'd':
          case 'h':
            e.preventDefault();
            router.push('/dashboard');
            return;
          case 's':
            e.preventDefault();
            router.push('/studio');
            return;
          case 'i':
            e.preventDefault();
            router.push('/insights');
            return;
          case 'f':
            e.preventDefault();
            router.push('/favorites');
            return;
          case 'a':
            e.preventDefault();
            router.push('/archive');
            return;
          case 'c':
            e.preventDefault();
            router.push('/collections');
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

      // Single key shortcuts (no modifier)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearPending();
    };
  }, [router, setViewMode, toggleSidebar, openModal, closeModal, activeModal, closeClipPeek, peekClipId]);
}
