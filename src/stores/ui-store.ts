import { create } from 'zustand';
import type { ViewMode, ClipSortBy, SortOrder } from '@/types/clip';

interface UIFilters {
  categoryId: string | null;
  collectionId: string | null;
  platform: string | null;
  isFavorite: boolean | null;
  isArchived: boolean | null;
}

interface UIState {
  sidebarOpen: boolean;
  viewMode: ViewMode;
  searchQuery: string;
  selectedClipIds: Set<string>;
  activeModal: string | null;
  sortBy: ClipSortBy;
  sortOrder: SortOrder;
  filters: UIFilters;
}

interface UIActions {
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  selectClip: (id: string) => void;
  deselectClip: (id: string) => void;
  toggleClipSelection: (id: string) => void;
  clearSelection: () => void;
  setSelectedClipIds: (ids: Set<string>) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  setSortBy: (sortBy: ClipSortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setFilter: <K extends keyof UIFilters>(key: K, value: UIFilters[K]) => void;
  clearFilters: () => void;
}

const DEFAULT_FILTERS: UIFilters = {
  categoryId: null,
  collectionId: null,
  platform: null,
  isFavorite: null,
  isArchived: false,
};

export const useUIStore = create<UIState & UIActions>((set) => ({
  // State
  sidebarOpen: true,
  viewMode: 'grid',
  searchQuery: '',
  selectedClipIds: new Set<string>(),
  activeModal: null,
  sortBy: 'created_at',
  sortOrder: 'desc',
  filters: DEFAULT_FILTERS,

  // Actions
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  selectClip: (id) =>
    set((s) => {
      const next = new Set(s.selectedClipIds);
      next.add(id);
      return { selectedClipIds: next };
    }),

  deselectClip: (id) =>
    set((s) => {
      const next = new Set(s.selectedClipIds);
      next.delete(id);
      return { selectedClipIds: next };
    }),

  toggleClipSelection: (id) =>
    set((s) => {
      const next = new Set(s.selectedClipIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedClipIds: next };
    }),

  clearSelection: () => set({ selectedClipIds: new Set<string>() }),

  setSelectedClipIds: (ids) => set({ selectedClipIds: ids }),

  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),

  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (order) => set({ sortOrder: order }),

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  clearFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
