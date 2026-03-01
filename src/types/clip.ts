import type { ClipPlatform, ContentType } from './database';

export type ViewMode = 'grid' | 'list' | 'headlines';

export type ClipSortBy =
  | 'created_at'
  | 'updated_at'
  | 'title'
  | 'view_count'
  | 'platform';

export type SortOrder = 'asc' | 'desc';

export interface ClipFilters {
  categoryId: string | null;
  collectionId: string | null;
  platform: ClipPlatform | null;
  contentType: ContentType | null;
  isFavorite: boolean | null;
  isArchived: boolean | null;
  tags: string[];
  searchQuery: string;
}

export interface ClipPaginationParams {
  page: number;
  pageSize: number;
  sortBy: ClipSortBy;
  sortOrder: SortOrder;
  filters: ClipFilters;
}

export const DEFAULT_CLIP_FILTERS: ClipFilters = {
  categoryId: null,
  collectionId: null,
  platform: null,
  contentType: null,
  isFavorite: null,
  isArchived: false,
  tags: [],
  searchQuery: '',
};
