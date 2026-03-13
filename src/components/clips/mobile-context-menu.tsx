'use client';

import { useEffect, useRef } from 'react';
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
  position: { x: number; y: number };
  actions: MobileContextMenuAction[];
}

/**
 * Mobile-optimized context menu that appears on long-press.
 * Positioned near the touch point, dismisses on backdrop tap.
 */
export function MobileContextMenu({ open, onClose, position, actions }: MobileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: keep menu within screen
    if (rect.right > vw - 8) {
      menu.style.left = `${vw - rect.width - 8}px`;
    }
    if (rect.left < 8) {
      menu.style.left = '8px';
    }
    // Vertical: if menu would go below viewport, show above touch point
    if (rect.bottom > vh - 8) {
      menu.style.top = `${position.y - rect.height - 8}px`;
    }
  }, [open, position]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop — use onTouchStart to intercept before child elements receive touch */}
      <div
        className="fixed inset-0 z-[70] lg:hidden"
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-[70] min-w-[180px] overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-elevated animate-fade-in lg:hidden"
        style={{ top: position.y, left: position.x }}
        role="menu"
      >
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
                'flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors active:bg-accent',
                action.variant === 'destructive'
                  ? 'text-destructive'
                  : 'text-foreground',
              )}
            >
              <Icon size={16} className={action.variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground'} />
              {action.label}
            </button>
          );
        })}
      </div>
    </>
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
      label: '컬렉션에 추가',
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
