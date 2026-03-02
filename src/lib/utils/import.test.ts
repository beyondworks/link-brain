import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { importClips, type ImportResult } from './import';

describe('importClips', () => {
  const mockFile = new File(['clip data'], 'clips.json', { type: 'application/json' });
  const mockResult: ImportResult = { imported: 5, skipped: 1, errors: 0 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a POST request to the import endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, data: mockResult }),
    });

    await importClips(mockFile);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/clips/import',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sends FormData containing the file', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, data: mockResult }),
    });

    await importClips(mockFile);

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.body).toBeInstanceOf(FormData);
    const formData = options.body as FormData;
    expect(formData.get('file')).toBe(mockFile);
  });

  it('returns ImportResult on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, data: mockResult }),
    });

    const result = await importClips(mockFile);

    expect(result).toEqual(mockResult);
  });

  it('throws on non-ok response with default message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue(null),
    });

    await expect(importClips(mockFile)).rejects.toThrow('Import failed');
  });

  it('throws with error message extracted from API response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: { message: 'Invalid file format' } }),
    });

    await expect(importClips(mockFile)).rejects.toThrow('Invalid file format');
  });

  it('throws with default message when API response JSON parse fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('JSON parse error')),
    });

    await expect(importClips(mockFile)).rejects.toThrow('Import failed');
  });
});
