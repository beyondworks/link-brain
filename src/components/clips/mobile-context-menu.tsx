'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckSquare,
  Star,
  Archive,
  EyeOff,
  Trash2,
  FolderPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MobileContextMenuAction {
  id: string;
  label: string;
  icon: React.ElementType;
  variant?: 'default' | 'destructive';
  onClick: () => void;
}

interface MobileContextMenuProps {
  open: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
  actions: MobileContextMenuAction[];
}

/**
 * Mobile bottom action bar that appears on long-press.
 * Uses createPortal to render at document.body level,
 * bypassing any transform/overflow containing blocks.
 */
export function MobileContextMenu({ open, onClose, actions }: MobileContextMenuProps) {
  // Clear any iOS text selection when menu opens
  useEffect(() => {
    if (open) {
      window.getSelection()?.removeAllRanges();
    }
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[70] bg-black/20 lg:hidden"
        style={{ top: 'env(safe-area-inset-top, 0px)' }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Bottom action bar — above bottom nav */}
      <div
        className="fixed left-0 right-0 bottom-[4rem] z-[70] lg:hidden animate-in slide-in-from-bottom-4 duration-200 pb-safe-bottom"
        role="menu"
      >
        <div className="touch-none-native mx-3 mb-2 overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-elevated">
          <div className="flex items-center justify-around px-1 py-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  role="menuitem"
                  onClick={() => {
                    action.onClick();
                    onClose();
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-colors active:bg-accent',
                    action.variant === 'destructive'
                      ? 'text-destructive'
                      : 'text-foreground',
                  )}
                >
                  <Icon
                    size={18}
                    className={
                      action.variant === 'destructive'
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }
                  />
                  <span className="text-[9px] font-medium leading-tight whitespace-nowrap">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

/** Helper to build standard clip context menu actions */
export function buildClipContextActions({
  clip,
  onSelect,
  onToggleFavorite,
  onArchive,
  onHide,
  onDelete,
  onAddToCollection,
}: {
  clip: { id: string; is_favorite?: boolean; is_archived?: boolean; is_hidden?: boolean };
  onSelect?: () => void;
  onToggleFavorite?: () => void;
  onArchive?: () => void;
  onHide?: () => void;
  onDelete?: () => void;
  onAddToCollection?: () => void;
}): MobileContextMenuAction[] {
  const actions: MobileContextMenuAction[] = [];

  if (onSelect) {
    actions.push({ id: 'select', label: '선택', icon: CheckSquare, onClick: onSelect });
  }
  if (onToggleFavorite) {
    actions.push({
      id: 'favorite',
      label: clip.is_favorite ? '즐겨찾기 해제' : '즐겨찾기',
      icon: Star,
      onClick: onToggleFavorite,
    });
  }
  if (onArchive) {
    actions.push({
      id: 'archive',
      label: clip.is_archived ? '아카이브 해제' : '아카이브',
      icon: Archive,
      onClick: onArchive,
    });
  }
  if (onHide) {
    actions.push({
      id: 'hide',
      label: clip.is_hidden ? '홈에서 표시' : '홈에서 숨김',
      icon: EyeOff,
      onClick: onHide,
    });
  }
  if (onAddToCollection) {
    actions.push({
      id: 'collection',
      label: '컬렉션 추가',
      icon: FolderPlus,
      onClick: onAddToCollection,
    });
  }
  if (onDelete) {
    actions.push({
      id: 'delete',
      label: '삭제',
      icon: Trash2,
      variant: 'destructive',
      onClick: onDelete,
    });
  }

  return actions;
}
