import type { ClipPlatform } from './database';

export type ViewMode = 'grid' | 'list' | 'headlines';

export type ClipSortBy =
  | 'created_at'
  | 'updated_at'
  | 'title'
  | 'views'
  | 'platform';

export type SortOrder = 'asc' | 'desc';

export type ReadStatus = 'all' | 'read' | 'unread';

export interface ClipFilters {
  categoryId?: string | null;
  collectionId?: string | null;
  platform?: ClipPlatform | null;
  isFavorite?: boolean | null;
  isReadLater?: boolean | null;
  isArchived?: boolean | null;
  isHidden?: boolean | null;
  tags?: string[];
  searchQuery?: string;
  dateRange?: { from?: string; to?: string } | null;
  readStatus?: ReadStatus | null;
  hasAiAnalysis?: boolean | null;
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
  isFavorite: null,
  isReadLater: null,
  isArchived: false,
  tags: [],
  searchQuery: '',
};
