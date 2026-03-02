import { toast } from 'sonner';

interface ShareData {
  title: string;
  url: string;
  text?: string;
}

export async function shareClip(data: ShareData): Promise<void> {
  // Try Web Share API first (mobile-friendly)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: data.title,
        text: data.text ?? data.title,
        url: data.url,
      });
      return;
    } catch (err) {
      // User cancelled share — silently ignore
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(data.url);
    toast.success('링크가 복사되었습니다');
  } catch {
    toast.error('공유에 실패했습니다');
  }
}
