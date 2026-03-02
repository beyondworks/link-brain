import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './ui-store';

beforeEach(() => {
  useUIStore.setState({
    sidebarOpen: true,
    viewMode: 'grid',
    searchQuery: '',
    selectedClipIds: new Set<string>(),
    isSelectionMode: false,
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
      dateRange: null,
      readStatus: null,
      hasAiAnalysis: null,
    },
    omniSearchOpen: false,
    peekClipId: null,
    clipPeekMode: 'side',
  });
});

describe('useUIStore — toggleClipSelection behavior', () => {
  it('adds id when not in set and sets isSelectionMode true', () => {
    useUIStore.getState().toggleClipSelection('clip-1');
    const state = useUIStore.getState();
    expect(state.selectedClipIds.has('clip-1')).toBe(true);
    expect(state.isSelectionMode).toBe(true);
  });

  it('removes id when already in set', () => {
    useUIStore.getState().toggleClipSelection('clip-1');
    useUIStore.getState().toggleClipSelection('clip-1');
    expect(useUIStore.getState().selectedClipIds.has('clip-1')).toBe(false);
  });

  it('sets isSelectionMode false when last item is removed', () => {
    useUIStore.getState().toggleClipSelection('clip-1');
    useUIStore.getState().toggleClipSelection('clip-1');
    expect(useUIStore.getState().isSelectionMode).toBe(false);
  });

  it('keeps isSelectionMode true when other items remain after toggle-off', () => {
    useUIStore.getState().toggleClipSelection('clip-1');
    useUIStore.getState().toggleClipSelection('clip-2');
    useUIStore.getState().toggleClipSelection('clip-1');
    const state = useUIStore.getState();
    expect(state.isSelectionMode).toBe(true);
    expect(state.selectedClipIds.has('clip-2')).toBe(true);
  });
});

describe('useUIStore — selectAllClips', () => {
  it('fills selectedClipIds with all provided IDs', () => {
    const ids = ['a', 'b', 'c'];
    useUIStore.getState().selectAllClips(ids);
    const { selectedClipIds } = useUIStore.getState();
    expect(selectedClipIds.size).toBe(3);
    ids.forEach((id) => expect(selectedClipIds.has(id)).toBe(true));
  });

  it('sets isSelectionMode to true', () => {
    useUIStore.getState().selectAllClips(['x', 'y']);
    expect(useUIStore.getState().isSelectionMode).toBe(true);
  });

  it('replaces previous selection', () => {
    useUIStore.getState().selectAllClips(['old-1', 'old-2']);
    useUIStore.getState().selectAllClips(['new-1']);
    const { selectedClipIds } = useUIStore.getState();
    expect(selectedClipIds.has('old-1')).toBe(false);
    expect(selectedClipIds.has('new-1')).toBe(true);
  });

  it('works with an empty array', () => {
    useUIStore.getState().selectAllClips([]);
    const state = useUIStore.getState();
    expect(state.selectedClipIds.size).toBe(0);
    expect(state.isSelectionMode).toBe(true);
  });
});

describe('useUIStore — clearSelection', () => {
  it('empties selectedClipIds', () => {
    useUIStore.getState().selectAllClips(['a', 'b', 'c']);
    useUIStore.getState().clearSelection();
    expect(useUIStore.getState().selectedClipIds.size).toBe(0);
  });

  it('sets isSelectionMode to false', () => {
    useUIStore.getState().selectAllClips(['a']);
    useUIStore.getState().clearSelection();
    expect(useUIStore.getState().isSelectionMode).toBe(false);
  });
});

describe('useUIStore — isSelectionMode toggle via setSelectionMode', () => {
  it('setSelectionMode(true) enables selection mode without clearing existing selection', () => {
    useUIStore.getState().selectClip('clip-1');
    useUIStore.getState().setSelectionMode(true);
    const state = useUIStore.getState();
    expect(state.isSelectionMode).toBe(true);
    expect(state.selectedClipIds.has('clip-1')).toBe(true);
  });

  it('setSelectionMode(false) disables mode and clears selection', () => {
    useUIStore.getState().selectAllClips(['clip-1', 'clip-2']);
    useUIStore.getState().setSelectionMode(false);
    const state = useUIStore.getState();
    expect(state.isSelectionMode).toBe(false);
    expect(state.selectedClipIds.size).toBe(0);
  });

  it('setSelectionMode(false) on already-false state is a no-op', () => {
    useUIStore.getState().setSelectionMode(false);
    const state = useUIStore.getState();
    expect(state.isSelectionMode).toBe(false);
    expect(state.selectedClipIds.size).toBe(0);
  });
});
