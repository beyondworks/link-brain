'use client';

import { memo } from 'react';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { PLATFORM_LABELS_EN } from '@/config/constants';
import type { ClipData } from '@/types/database';

interface StudioClipPickerItemProps {
  clip: ClipData;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onPreview: (id: string) => void;
}

function StudioClipPickerItemInner({
  clip,
  isSelected,
  onToggle,
  onPreview,
}: StudioClipPickerItemProps) {
  const platformLabel = clip.platform
    ? (PLATFORM_LABELS_EN[clip.platform] ?? clip.platform)
    : null;
  const dateStr = new Date(clip.created_at).toLocaleDateString('ko-KR');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(clip.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(clip.id);
        }
      }}
      className={cn(
        'flex items-center gap-3 rounded-lg px-2 py-2.5 cursor-pointer transition-colors',
        isSelected
          ? 'bg-primary/8 border border-primary/30'
          : 'hover:bg-muted/50 border border-transparent'
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(clip.id)}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0"
      />

      {clip.image ? (
        <img
          src={clip.image}
          alt=""
          className="h-10 w-10 shrink-0 rounded-md object-cover bg-muted"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground',
        clip.image && 'hidden'
      )}>
        {(clip.title ?? clip.url).charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {clip.title ?? clip.url}
        </p>
        <p className="text-xs text-muted-foreground">
          {platformLabel && <span className="capitalize">{platformLabel}</span>}
          {platformLabel && ' · '}
          {dateStr}
        </p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPreview(clip.id);
        }}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="미리보기"
      >
        <Eye size={14} />
      </button>
    </div>
  );
}

export const StudioClipPickerItem = memo(StudioClipPickerItemInner);
