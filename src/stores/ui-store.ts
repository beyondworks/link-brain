import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode, ClipSortBy, SortOrder, ReadStatus } from '@/types/clip';

export type ClipPeekMode = 'side' | 'center' | 'full';

interface UIFilters {
  categoryId: string | null;
  collectionId: string | null;
  platform: string | null;
  isFavorite: boolean | null;
  isReadLater: boolean | null;
  isArchived: boolean | null;
  isHidden: boolean | null;
  dateRange: { from?: string; to?: string } | null;
  readStatus: ReadStatus | null;
  hasAiAnalysis: boolean | null;
}

interface UIState {
  sidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  viewMode: ViewMode;
  searchQuery: string;
  selectedClipIds: Set<string>;
  isSelectionMode: boolean;
  activeModal: string | null;
  sortBy: ClipSortBy;
  sortOrder: SortOrder;
  filters: UIFilters;
  omniSearchOpen: boolean;
  peekClipId: string | null;
  clipPeekMode: ClipPeekMode;
  pendingSaveCount: number;
  completedSaveCount: number;
}

interface UIActions {
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setOmniSearchOpen: (open: boolean) => void;
  selectClip: (id: string) => void;
  deselectClip: (id: string) => void;
  toggleClipSelection: (id: string) => void;
  selectAllClips: (clipIds: string[]) => void;
  clearSelection: () => void;
  setSelectedClipIds: (ids: Set<string>) => void;
  setSelectionMode: (enabled: boolean) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  setSortBy: (sortBy: ClipSortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setFilter: <K extends keyof UIFilters>(key: K, value: UIFilters[K]) => void;
  setQuickFilter: (key: 'all' | 'favorite' | 'readLater' | 'unread') => void;
  clearFilters: () => void;
  openClipPeek: (clipId: string) => void;
  closeClipPeek: () => void;
  setClipPeekMode: (mode: ClipPeekMode) => void;
  incrementPendingSave: () => void;
  completePendingSave: () => void;
  failPendingSave: () => void;
  resetSaveProgress: () => void;
}

const DEFAULT_FILTERS: UIFilters = {
  categoryId: null,
  collectionId: null,
  platform: null,
  isFavorite: null,
  isReadLater: null,
  isArchived: false,
  isHidden: null,
  dateRange: null,
  readStatus: null,
  hasAiAnalysis: null,
};

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      // State
      sidebarOpen: false,
      isSidebarCollapsed: false,
      viewMode: 'grid',
      searchQuery: '',
      selectedClipIds: new Set<string>(),
      isSelectionMode: false,
      activeModal: null,
      sortBy: 'created_at',
      sortOrder: 'desc',
      filters: DEFAULT_FILTERS,
      omniSearchOpen: false,
      peekClipId: null,
      clipPeekMode: 'side',
      pendingSaveCount: 0,
      completedSaveCount: 0,

      // Actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleSidebarCollapse: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
      setViewMode: (mode) => set({ viewMode: mode }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setOmniSearchOpen: (open) => set({ omniSearchOpen: open }),

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
          return { selectedClipIds: next, isSelectionMode: next.size > 0 };
        }),

      selectAllClips: (clipIds) => set({ selectedClipIds: new Set(clipIds), isSelectionMode: true }),

      clearSelection: () => set({ selectedClipIds: new Set<string>(), isSelectionMode: false }),

      setSelectionMode: (enabled) =>
        set((s) => ({
          isSelectionMode: enabled,
          selectedClipIds: enabled ? s.selectedClipIds : new Set<string>(),
        })),

      setSelectedClipIds: (ids) => set({ selectedClipIds: ids }),

      openModal: (modal) => set({ activeModal: modal }),
      closeModal: () => set({ activeModal: null }),

      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (order) => set({ sortOrder: order }),

      setFilter: (key, value) =>
        set((s) => ({ filters: { ...s.filters, [key]: value } })),

      setQuickFilter: (key) =>
        set((s) => ({
          filters: {
            ...s.filters,
            isFavorite: key === 'favorite' ? true : null,
            isReadLater: key === 'readLater' ? true : null,
            readStatus: key === 'unread' ? 'unread' : null,
          },
        })),

      clearFilters: () => set({ filters: DEFAULT_FILTERS }),

      openClipPeek: (clipId) => set({ peekClipId: clipId }),
      closeClipPeek: () => set({ peekClipId: null }),
      setClipPeekMode: (mode) => set({ clipPeekMode: mode }),

      incrementPendingSave: () =>
        set((s) => ({ pendingSaveCount: s.pendingSaveCount + 1 })),

      completePendingSave: () =>
        set((s) => ({
          pendingSaveCount: Math.max(0, s.pendingSaveCount - 1),
          completedSaveCount: s.completedSaveCount + 1,
        })),

      failPendingSave: () =>
        set((s) => ({
          pendingSaveCount: Math.max(0, s.pendingSaveCount - 1),
        })),

      resetSaveProgress: () =>
        set({ pendingSaveCount: 0, completedSaveCount: 0 }),
    }),
    {
      name: 'linkbrain-ui',
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed, viewMode: state.viewMode }),
    },
  ),
);
