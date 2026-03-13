'use client';

import { FolderOpen, BookMarked, Image } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useSearchResults } from '@/lib/hooks/use-search-results';
import { cn } from '@/lib/utils';
import type { Category, Collection, ClipData } from '@/types/database';

interface SearchResultsOverlayProps {
  search: string;
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-muted-foreground/60" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
        {label}
      </span>
    </div>
  );
}

function Pill({
  label,
  color,
  onClick,
}: {
  label: string;
  color?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium',
        'transition-colors hover:border-primary/40 hover:bg-accent/60 hover:text-foreground',
        'text-foreground/80'
      )}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}

export function SearchResultsOverlay({ search }: SearchResultsOverlayProps) {
  const setFilter = useUIStore((s) => s.setFilter);
  const openClipPeek = useUIStore((s) => s.openClipPeek);

  const { categories, collections, images, isLoading, hasResults } = useSearchResults(search);

  if (!search.trim()) return null;
  if (isLoading) return null;
  if (!hasResults) return null;

  const handleCategoryClick = (category: Category) => {
    setFilter('categoryId', category.id);
  };

  const handleCollectionClick = (collection: Collection) => {
    setFilter('collectionId', collection.id);
  };

  const handleImageClick = (clip: ClipData) => {
    openClipPeek(clip.id);
  };

  return (
    <div className="mb-5 rounded-xl border border-border/60 bg-card/80 p-4 shadow-card backdrop-blur-sm">
      <div className="flex flex-col gap-4">
        {categories.length > 0 && (
          <div>
            <SectionHeader icon={FolderOpen} label="카테고리" />
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Pill
                  key={cat.id}
                  label={cat.name}
                  color={cat.color}
                  onClick={() => handleCategoryClick(cat)}
                />
              ))}
            </div>
          </div>
        )}

        {collections.length > 0 && (
          <div>
            <SectionHeader icon={BookMarked} label="컬렉션" />
            <div className="flex flex-wrap gap-2">
              {collections.map((col) => (
                <Pill
                  key={col.id}
                  label={col.name}
                  color={col.color}
                  onClick={() => handleCollectionClick(col)}
                />
              ))}
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div>
            <SectionHeader icon={Image} label="이미지" />
            <div className="flex flex-wrap gap-2">
              {images.map((img) => (
                <Pill
                  key={img.id}
                  label={img.title ?? '이미지 클립'}
                  onClick={() => handleImageClick(img)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
