import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './ui-store';

// Reset Zustand store state between tests
beforeEach(() => {
  useUIStore.setState({
    sidebarOpen: true,
    viewMode: 'grid',
    searchQuery: '',
    selectedClipIds: new Set<string>(),
    activeModal: null,
    sortBy: 'created_at',
    sortOrder: 'desc',
    filters: {
      categoryId: null,
      collectionId: null,
      platform: null,
      isFavorite: null,
      isReadLater: null,
      isArchived: false,
    },
    omniSearchOpen: false,
    peekClipId: null,
    clipPeekMode: 'side',
  });
});

describe('useUIStore — initial state', () => {
  it('sidebarOpen defaults to true', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });

  it('viewMode defaults to "grid"', () => {
    expect(useUIStore.getState().viewMode).toBe('grid');
  });

  it('searchQuery defaults to empty string', () => {
    expect(useUIStore.getState().searchQuery).toBe('');
  });

  it('activeModal defaults to null', () => {
    expect(useUIStore.getState().activeModal).toBeNull();
  });

  it('sortBy defaults to "created_at"', () => {
    expect(useUIStore.getState().sortBy).toBe('created_at');
  });

  it('sortOrder defaults to "desc"', () => {
    expect(useUIStore.getState().sortOrder).toBe('desc');
  });

  it('selectedClipIds defaults to empty Set', () => {
    expect(useUIStore.getState().selectedClipIds.size).toBe(0);
  });

  it('omniSearchOpen defaults to false', () => {
    expect(useUIStore.getState().omniSearchOpen).toBe(false);
  });

  it('peekClipId defaults to null', () => {
    expect(useUIStore.getState().peekClipId).toBeNull();
  });

  it('clipPeekMode defaults to "side"', () => {
    expect(useUIStore.getState().clipPeekMode).toBe('side');
  });

  it('filters.isArchived defaults to false', () => {
    expect(useUIStore.getState().filters.isArchived).toBe(false);
  });
});

describe('useUIStore — sidebar', () => {
  it('setSidebarOpen sets the value', () => {
    useUIStore.getState().setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('toggleSidebar flips the value', () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });
});

describe('useUIStore — viewMode', () => {
  it('setViewMode updates the mode', () => {
    useUIStore.getState().setViewMode('list');
    expect(useUIStore.getState().viewMode).toBe('list');
  });

  it('setViewMode accepts all valid modes', () => {
    const modes = ['grid', 'list', 'headlines'] as const;
    modes.forEach((mode) => {
      useUIStore.getState().setViewMode(mode);
      expect(useUIStore.getState().viewMode).toBe(mode);
    });
  });
});

describe('useUIStore — modal', () => {
  it('openModal sets activeModal', () => {
    useUIStore.getState().openModal('add-clip');
    expect(useUIStore.getState().activeModal).toBe('add-clip');
  });

  it('closeModal clears activeModal', () => {
    useUIStore.getState().openModal('settings');
    useUIStore.getState().closeModal();
    expect(useUIStore.getState().activeModal).toBeNull();
  });
});

describe('useUIStore — clip selection', () => {
  it('selectClip adds id to selectedClipIds', () => {
    useUIStore.getState().selectClip('clip-1');
    expect(useUIStore.getState().selectedClipIds.has('clip-1')).toBe(true);
  });

  it('deselectClip removes id from selectedClipIds', () => {
    useUIStore.getState().selectClip('clip-1');
    useUIStore.getState().deselectClip('clip-1');
    expect(useUIStore.getState().selectedClipIds.has('clip-1')).toBe(false);
  });

  it('toggleClipSelection adds when not present', () => {
    useUIStore.getState().toggleClipSelection('clip-2');
    expect(useUIStore.getState().selectedClipIds.has('clip-2')).toBe(true);
  });

  it('toggleClipSelection removes when already present', () => {
    useUIStore.getState().selectClip('clip-2');
    useUIStore.getState().toggleClipSelection('clip-2');
    expect(useUIStore.getState().selectedClipIds.has('clip-2')).toBe(false);
  });

  it('clearSelection empties the set', () => {
    useUIStore.getState().selectClip('clip-1');
    useUIStore.getState().selectClip('clip-2');
    useUIStore.getState().clearSelection();
    expect(useUIStore.getState().selectedClipIds.size).toBe(0);
  });

  it('setSelectedClipIds replaces the entire set', () => {
    const ids = new Set(['a', 'b', 'c']);
    useUIStore.getState().setSelectedClipIds(ids);
    expect(useUIStore.getState().selectedClipIds).toEqual(ids);
  });
});

describe('useUIStore — sort', () => {
  it('setSortBy updates sortBy', () => {
    useUIStore.getState().setSortBy('title');
    expect(useUIStore.getState().sortBy).toBe('title');
  });

  it('setSortOrder updates sortOrder', () => {
    useUIStore.getState().setSortOrder('asc');
    expect(useUIStore.getState().sortOrder).toBe('asc');
  });
});

describe('useUIStore — filters', () => {
  it('setFilter updates a specific filter key', () => {
    useUIStore.getState().setFilter('platform', 'youtube');
    expect(useUIStore.getState().filters.platform).toBe('youtube');
  });

  it('setFilter does not affect other filter keys', () => {
    useUIStore.getState().setFilter('platform', 'github');
    expect(useUIStore.getState().filters.isFavorite).toBeNull();
  });

  it('setQuickFilter("favorite") sets isFavorite to true and clears isReadLater', () => {
    useUIStore.getState().setQuickFilter('favorite');
    expect(useUIStore.getState().filters.isFavorite).toBe(true);
    expect(useUIStore.getState().filters.isReadLater).toBeNull();
  });

  it('setQuickFilter("readLater") sets isReadLater to true and clears isFavorite', () => {
    useUIStore.getState().setQuickFilter('readLater');
    expect(useUIStore.getState().filters.isReadLater).toBe(true);
    expect(useUIStore.getState().filters.isFavorite).toBeNull();
  });

  it('setQuickFilter("all") clears both isFavorite and isReadLater', () => {
    useUIStore.getState().setQuickFilter('favorite');
    useUIStore.getState().setQuickFilter('all');
    expect(useUIStore.getState().filters.isFavorite).toBeNull();
    expect(useUIStore.getState().filters.isReadLater).toBeNull();
  });

  it('clearFilters resets all filters to defaults', () => {
    useUIStore.getState().setFilter('platform', 'youtube');
    useUIStore.getState().setFilter('isFavorite', true);
    useUIStore.getState().clearFilters();
    const filters = useUIStore.getState().filters;
    expect(filters.platform).toBeNull();
    expect(filters.isFavorite).toBeNull();
    expect(filters.isArchived).toBe(false);
  });
});

describe('useUIStore — clip peek', () => {
  it('openClipPeek sets peekClipId', () => {
    useUIStore.getState().openClipPeek('clip-abc');
    expect(useUIStore.getState().peekClipId).toBe('clip-abc');
  });

  it('closeClipPeek clears peekClipId', () => {
    useUIStore.getState().openClipPeek('clip-abc');
    useUIStore.getState().closeClipPeek();
    expect(useUIStore.getState().peekClipId).toBeNull();
  });

  it('setClipPeekMode updates the mode', () => {
    useUIStore.getState().setClipPeekMode('center');
    expect(useUIStore.getState().clipPeekMode).toBe('center');
  });

  it('setClipPeekMode accepts all valid modes', () => {
    const modes = ['side', 'center', 'full'] as const;
    modes.forEach((mode) => {
      useUIStore.getState().setClipPeekMode(mode);
      expect(useUIStore.getState().clipPeekMode).toBe(mode);
    });
  });
});

describe('useUIStore — omniSearch', () => {
  it('setOmniSearchOpen updates omniSearchOpen', () => {
    useUIStore.getState().setOmniSearchOpen(true);
    expect(useUIStore.getState().omniSearchOpen).toBe(true);
    useUIStore.getState().setOmniSearchOpen(false);
    expect(useUIStore.getState().omniSearchOpen).toBe(false);
  });
});

describe('useUIStore — searchQuery', () => {
  it('setSearchQuery updates searchQuery', () => {
    useUIStore.getState().setSearchQuery('test query');
    expect(useUIStore.getState().searchQuery).toBe('test query');
  });
});
