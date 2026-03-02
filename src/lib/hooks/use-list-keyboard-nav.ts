'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ClipData } from '@/types/database';
import { useUIStore } from '@/stores/ui-store';

interface UseListKeyboardNavOptions {
  clips: ClipData[];
  onOpen?: (clip: ClipData) => void;
}

interface UseListKeyboardNavReturn {
  focusedIndex: number | null;
  setFocusedIndex: (index: number | null) => void;
}

/**
 * Keyboard navigation for clip lists.
 *
 * j / ArrowDown: Move focus down
 * k / ArrowUp: Move focus up
 * Enter: Open focused clip (peek panel)
 * x: Toggle selection on focused clip
 *
 * Scrolls focused item into view using data-clip-index attribute.
 * Disabled when an input/textarea/contenteditable is focused.
 */
export function useListKeyboardNav({
  clips,
  onOpen,
}: UseListKeyboardNavOptions): UseListKeyboardNavReturn {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const openClipPeek = useUIStore((s) => s.openClipPeek);
  const toggleClipSelection = useUIStore((s) => s.toggleClipSelection);

  const scrollIntoView = useCallback((index: number) => {
    const el = document.querySelector<HTMLElement>(`[data-clip-index="${index}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Reset focus when clip list changes
    setFocusedIndex(null);
  }, [clips.length]);

  useEffect(() => {
    function isInputFocused(): boolean {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if ((el as HTMLElement).isContentEditable) return true;
      return false;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (clips.length === 0) return;

      switch (e.key) {
        case 'j':
        case 'ArrowDown': {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev === null ? 0 : Math.min(prev + 1, clips.length - 1);
            scrollIntoView(next);
            return next;
          });
          break;
        }
        case 'k':
        case 'ArrowUp': {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev === null ? clips.length - 1 : Math.max(prev - 1, 0);
            scrollIntoView(next);
            return next;
          });
          break;
        }
        case 'Enter': {
          if (focusedIndex === null) break;
          const clip = clips[focusedIndex];
          if (!clip) break;
          e.preventDefault();
          if (onOpen) {
            onOpen(clip);
          } else {
            openClipPeek(clip.id);
          }
          break;
        }
        case 'x': {
          if (focusedIndex === null) break;
          const clip = clips[focusedIndex];
          if (!clip) break;
          e.preventDefault();
          toggleClipSelection(clip.id);
          break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clips, focusedIndex, openClipPeek, toggleClipSelection, scrollIntoView, onOpen]);

  return { focusedIndex, setFocusedIndex };
}
