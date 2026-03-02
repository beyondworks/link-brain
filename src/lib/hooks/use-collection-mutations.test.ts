import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Supabase client before importing the module under test
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useCurrentUser
vi.mock('@/lib/hooks/use-current-user', () => ({
  useCurrentUser: vi.fn(),
}));

// Mock next/navigation (already in setup.ts but explicit here for clarity)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock TanStack Query hooks — we test the callbacks directly
vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((opts) => ({
    mutate: (vars: unknown) => opts.mutationFn(vars),
    mutateAsync: (vars: unknown) => opts.mutationFn(vars),
    _opts: opts,
  })),
  useQueryClient: vi.fn(),
}));

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  useUpdateCollection,
  useDeleteCollection,
  useRemoveClipFromCollection,
} from './use-collection-mutations';
import type { Collection } from '@/types/database';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'update', 'delete', 'insert', 'single'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return chain;
}

function makeQueryClient() {
  return {
    cancelQueries: vi.fn().mockResolvedValue(undefined),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  };
}

function makeCollection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'col-1',
    user_id: 'user-1',
    name: 'My Collection',
    description: null,
    color: null,
    is_public: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const mockUseMutation = useMutation as ReturnType<typeof vi.fn>;
const mockUseQueryClient = useQueryClient as ReturnType<typeof vi.fn>;
const mockUseCurrentUser = useCurrentUser as ReturnType<typeof vi.fn>;
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

// ─── useUpdateCollection ──────────────────────────────────────────────────────

describe('useUpdateCollection', () => {
  let qc: ReturnType<typeof makeQueryClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = makeQueryClient();
    mockUseQueryClient.mockReturnValue(qc);
    mockUseCurrentUser.mockReturnValue({ user: { id: 'user-1' } });
  });

  it('optimistically updates the collections list on mutate', async () => {
    const existing = [makeCollection({ id: 'col-1', name: 'Old Name' })];
    qc.getQueryData.mockReturnValueOnce(existing).mockReturnValueOnce(null);

    // Capture the opts passed to useMutation
    let capturedOpts: Record<string, unknown> = {};
    mockUseMutation.mockImplementationOnce((opts: Record<string, unknown>) => {
      capturedOpts = opts;
      return { mutate: vi.fn() };
    });

    useUpdateCollection();

    const onMutate = capturedOpts.onMutate as (v: unknown) => Promise<unknown>;
    await onMutate({ collectionId: 'col-1', name: 'New Name', description: null, color: null });

    // Should cancel queries
    expect(qc.cancelQueries).toHaveBeenCalledWith({ queryKey: ['collections'] });
    expect(qc.cancelQueries).toHaveBeenCalledWith({ queryKey: ['collection', 'col-1'] });

    // Should call setQueryData with a mapper function
    expect(qc.setQueryData).toHaveBeenCalledWith(
      ['collections', 'user-1'],
      expect.any(Function)
    );
  });

  it('optimistic mapper renames the matching collection', async () => {
    const existing: Collection[] = [
      makeCollection({ id: 'col-1', name: 'Old Name' }),
      makeCollection({ id: 'col-2', name: 'Other' }),
    ];
    qc.getQueryData.mockReturnValueOnce(existing).mockReturnValueOnce(null);

    let capturedOpts: Record<string, unknown> = {};
    mockUseMutation.mockImplementationOnce((opts: Record<string, unknown>) => {
      capturedOpts = opts;
      return { mutate: vi.fn() };
    });

    useUpdateCollection();

    const onMutate = capturedOpts.onMutate as (v: unknown) => Promise<unknown>;
    await onMutate({ collectionId: 'col-1', name: 'New Name', description: 'desc', color: '#fff' });

    // Extract the mapper function passed to setQueryData for the list
    const listCall = (qc.setQueryData as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => Array.isArray(c[0]) && c[0][0] === 'collections'
    );
    expect(listCall).toBeDefined();
    const mapper = listCall![1] as (old: Collection[]) => Collection[];
    const result = mapper(existing);

    expect(result[0].name).toBe('New Name');
    expect(result[0].description).toBe('desc');
    expect(result[0].color).toBe('#fff');
    // Other collection unchanged
    expect(result[1].name).toBe('Other');
  });

  it('rolls back on error when context has previousList', async () => {
    const snapshot: Collection[] = [makeCollection()];
    qc.getQueryData.mockReturnValueOnce(snapshot).mockReturnValueOnce(null);

    let capturedOpts: Record<string, unknown> = {};
    mockUseMutation.mockImplementationOnce((opts: Record<string, unknown>) => {
      capturedOpts = opts;
      return { mutate: vi.fn() };
    });

    useUpdateCollection();

    const onError = capturedOpts.onError as (
      err: unknown,
      vars: unknown,
      ctx: unknown
    ) => void;
    onError(new Error('DB error'), { collectionId: 'col-1' }, {
      previousList: snapshot,
      previousDetail: undefined,
    });

    expect(qc.setQueryData).toHaveBeenCalledWith(['collections', 'user-1'], snapshot);
    expect(toast.error).toHaveBeenCalledWith('컬렉션 수정에 실패했습니다.');
  });

  it('shows success toast and invalidates queries on success', async () => {
    let capturedOpts: Record<string, unknown> = {};
    mockUseMutation.mockImplementationOnce((opts: Record<string, unknown>) => {
      capturedOpts = opts;
      return { mutate: vi.fn() };
    });

    useUpdateCollection();

    const onSuccess = capturedOpts.onSuccess as () => void;
    const onSettled = capturedOpts.onSettled as (d: unknown, e: unknown, v: { collectionId: string }) => void;

    onSuccess();
    expect(toast.success).toHaveBeenCalledWith('컬렉션이 수정되었습니다.');

    onSettled(null, null, { collectionId: 'col-1' });
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['collections'] });
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['collection', 'col-1'] });
  });

  it('mutationFn calls supabase update and returns data', async () => {
    const updatedCol = makeCollection({ name: 'Updated' });
    const chain = makeChain({ data: updatedCol, error: null });
    mockFrom.mockReturnValue(chain);

    let capturedOpts: Record<string, unknown> = {};
    mockUseMutation.mockImplementationOnce((opts: Record<string, unknown>) => {
      capturedOpts = opts;
      return { mutate: vi.fn() };
    });

    useUpdateCollection();

    const fn = capturedOpts.mutationFn as (v: unknown) => Promise<Collection>;
    const result = await fn({ collectionId: 'col-1', name: 'Updated', description: null, color: null });

    expect(mockFrom).toHaveBeenCalledWith('collections');
    expect(result).toEqual(updatedCol);
  });
});

// ─── useDeleteCollection ─────────────────────────────────────────────────────

describe('useDeleteCollection', () => {
  let qc: ReturnType<typeof makeQueryClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = makeQueryClient();
    mockUseQueryClient.mockReturnValue(qc);
    mockUseCurrentUser.mockReturnValue({ user: { id: 'user-1' } });
  });

  it('optimistically removes collection from list on mutate', async () => {
    const list: Collection[] = [
      makeCollection({ id: 'col-1' }),
      makeCollection({ id: 'col-2', name: 'Keep' }),
    ];
    qc.getQueryData.mockReturnValueOnce(list);

    let capturedOpts: Record<string, unknown> = {};
    mockUseMutation.mockImplementationOnce((opts: Record<string, unknown>) => {
      capturedOpts = opts;
      return { mutate: vi.fn() };
    });

    useDeleteCollection();

    const onMutate = capturedOpts.onMutate as (v: { collectionId: string }) => Promise<unknown>;
    await onMutate({ collectionId: 'col-1' });

    expect(qc.cancelQueries).toHaveBeenCalledWith({ queryKey: ['collections'] });

    // The filter mapper should remove col-1
    const filterCall = (qc.setQueryData as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(filterCall[0]).toEqual(['collections', 'user-1']);
    const filtered = (filterCall[1] as (old: Collection[]) => Collection[])(list);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('col-2');
  });

  it('rolls back on error', async () => {
    const snapshot: Collection[] = [makeCollection()];
    qc.getQueryData.mockReturnValueOnce(snapshot);

    let capturedOpts: Record<string, unknown> = {};
    mockUseMutation.mockImplementationOnce((opts: Record<string, unknown>) => {
      capturedOpts = opts;
      return { mutate: vi.fn() };
    });

    useDeleteCollection();

    const onError = capturedOpts.onError as (
      err: unknown,
      vars: unknown,
      ctx: { previousList: Collection[] }
    ) => void;
    onError(new Error('fail'), {}, { previousList: snapshot });

    expect(qc.setQueryData).toHaveBeenCalledWith(['collections', 'user-1'], snapshot);
    expect(toast.error).toHaveBeenCalledWith('컬렉션 삭제에 실패했습니다.');
  });

  it('invalidates collections query on settled', async () => {
    let capturedOpts: Record<string, unknown> = {};
    mockUseMutation.mockImplementationOnce((opts: Record<string, unknown>) => {
      capturedOpts = opts;
      return { mutate: vi.fn() };
    });

    useDeleteCollection();

    const onSettled = capturedOpts.onSettled as () => void;
    onSettled();

    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['collections'] });
  });

  it('mutationFn calls supabase delete', async () => {
    const chain = makeChain({ error: null });
    mockFrom.mockReturnValue(chain);

    let capturedOpts: Record<string, unknown> = {};
    mockUseMutation.mockImplementationOnce((opts: Record<string, unknown>) => {
      capturedOpts = opts;
      return { mutate: vi.fn() };
    });

    useDeleteCollection();

    const fn = capturedOpts.mutationFn as (v: { collectionId: string }) => Promise<unknown>;
    const result = await fn({ collectionId: 'col-1' });

    expect(mockFrom).toHaveBeenCalledWith('collections');
    expect(result).toEqual({ collectionId: 'col-1' });
  });
});

// ─── useRemoveClipFromCollection ─────────────────────────────────────────────

describe('useRemoveClipFromCollection', () => {
  let qc: ReturnType<typeof makeQueryClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = makeQueryClient();
    mockUseQueryClient.mockReturnValue(qc);
    mockUseCurrentUser.mockReturnValue({ user: { id: 'user-1' } });
  });

  it('invalidates collection-clips query on success', async () => {
    let capturedOpts: Record<string, unknown> = {};
    mockUseMutation.mockImplementationOnce((opts: Record<string, unknown>) => {
      capturedOpts = opts;
      return { mutate: vi.fn() };
    });

    useRemoveClipFromCollection();

    const onSuccess = capturedOpts.onSuccess as (
      d: unknown,
      v: { clipId: string; collectionId: string }
    ) => void;
    onSuccess({}, { clipId: 'clip-1', collectionId: 'col-1' });

    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['collection-clips', 'col-1'],
    });
    expect(toast.success).toHaveBeenCalledWith('클립이 컬렉션에서 제거되었습니다.');
  });

  it('shows error toast on failure', async () => {
    let capturedOpts: Record<string, unknown> = {};
    mockUseMutation.mockImplementationOnce((opts: Record<string, unknown>) => {
      capturedOpts = opts;
      return { mutate: vi.fn() };
    });

    useRemoveClipFromCollection();

    const onError = capturedOpts.onError as () => void;
    onError();

    expect(toast.error).toHaveBeenCalledWith('클립 제거에 실패했습니다.');
  });

  it('mutationFn calls supabase delete on clip_collections', async () => {
    const chain = makeChain({ error: null });
    mockFrom.mockReturnValue(chain);

    let capturedOpts: Record<string, unknown> = {};
    mockUseMutation.mockImplementationOnce((opts: Record<string, unknown>) => {
      capturedOpts = opts;
      return { mutate: vi.fn() };
    });

    useRemoveClipFromCollection();

    const fn = capturedOpts.mutationFn as (v: {
      clipId: string;
      collectionId: string;
    }) => Promise<unknown>;
    const result = await fn({ clipId: 'clip-1', collectionId: 'col-1' });

    expect(mockFrom).toHaveBeenCalledWith('clip_collections');
    expect(result).toEqual({ clipId: 'clip-1', collectionId: 'col-1' });
  });
});
