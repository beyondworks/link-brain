import { vi, describe, it, expect, beforeEach } from 'vitest';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { shareClip } from './share';

const BASE_DATA = { title: 'Test Title', url: 'https://example.com/clip/1' };

describe('shareClip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when navigator.share is available', () => {
    beforeEach(() => {
      vi.stubGlobal('navigator', {
        share: vi.fn().mockResolvedValue(undefined),
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    });

    it('calls navigator.share with correct params', async () => {
      await shareClip(BASE_DATA);

      expect(navigator.share).toHaveBeenCalledOnce();
      expect(navigator.share).toHaveBeenCalledWith({
        title: BASE_DATA.title,
        text: BASE_DATA.title, // text falls back to title when not provided
        url: BASE_DATA.url,
      });
    });

    it('uses provided text when given', async () => {
      await shareClip({ ...BASE_DATA, text: 'Custom text' });

      expect(navigator.share).toHaveBeenCalledWith({
        title: BASE_DATA.title,
        text: 'Custom text',
        url: BASE_DATA.url,
      });
    });

    it('does not show any toast on success', async () => {
      await shareClip(BASE_DATA);

      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('does not show any toast when user cancels (AbortError)', async () => {
      const abortError = new Error('Share cancelled');
      abortError.name = 'AbortError';
      (navigator.share as ReturnType<typeof vi.fn>).mockRejectedValue(abortError);

      await shareClip(BASE_DATA);

      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('does not fall back to clipboard when navigator.share succeeds', async () => {
      await shareClip(BASE_DATA);

      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
  });

  describe('when navigator.share is not available (clipboard fallback)', () => {
    beforeEach(() => {
      vi.stubGlobal('navigator', {
        // No share property — simulates desktop browsers
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    });

    it('calls clipboard.writeText with the clip URL', async () => {
      await shareClip(BASE_DATA);

      expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(BASE_DATA.url);
    });

    it('shows success toast when clipboard.writeText succeeds', async () => {
      await shareClip(BASE_DATA);

      expect(toast.success).toHaveBeenCalledOnce();
      expect(toast.success).toHaveBeenCalledWith('링크가 복사되었습니다');
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('shows error toast when clipboard.writeText fails', async () => {
      (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Clipboard denied')
      );

      await shareClip(BASE_DATA);

      expect(toast.error).toHaveBeenCalledOnce();
      expect(toast.error).toHaveBeenCalledWith('공유에 실패했습니다');
      expect(toast.success).not.toHaveBeenCalled();
    });
  });
});
