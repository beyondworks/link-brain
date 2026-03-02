import { vi, describe, it, expect, beforeEach } from 'vitest';

// Stub browser globals before importing the module under test (node env has none)
const mockClick = vi.fn();
const mockAnchor = { href: '', download: '', click: mockClick };
const mockCreateElement = vi.fn(() => mockAnchor);
vi.stubGlobal('document', { createElement: mockCreateElement });

const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
vi.stubGlobal('URL', {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
});

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { exportClips } from './export';

describe('exportClips', () => {
  const mockBlob = new Blob(['data'], { type: 'application/json' });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
    mockFetch.mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });
  });

  it('calls fetch with correct URL for json format', async () => {
    await exportClips('json');

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/clips/export?format=json');
  });

  it('calls fetch with correct URL for csv format', async () => {
    await exportClips('csv');

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/clips/export?format=csv');
  });

  it('defaults to json format when no format argument given', async () => {
    await exportClips();

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/clips/export?format=json');
  });

  it('creates and clicks a download link with the blob URL', async () => {
    await exportClips('json');

    expect(mockCreateElement).toHaveBeenCalledWith('a');
    expect(mockAnchor.href).toBe('blob:mock-url');
    expect(mockClick).toHaveBeenCalledOnce();
  });

  it('sets download filename with correct format extension', async () => {
    await exportClips('csv');

    expect(mockAnchor.download).toMatch(/^linkbrain-clips-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('throws an error on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    await expect(exportClips('json')).rejects.toThrow('Export failed');
  });
});
