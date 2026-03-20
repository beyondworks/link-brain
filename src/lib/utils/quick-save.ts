import { toast } from 'sonner';
import { useUIStore } from '@/stores/ui-store';
import { addNotification } from '@/lib/hooks/use-notifications';

function isValidHttpUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** 텍스트에서 첫 번째 HTTP URL을 추출 */
function extractUrl(text: string): string | null {
  const trimmed = text.trim();

  // 전체가 URL인 경우
  if (isValidHttpUrl(trimmed)) return trimmed;

  // 텍스트 속 URL 추출
  const urlMatch = trimmed.match(/https?:\/\/[^\s<>"')\]]+/);
  return urlMatch ? urlMatch[0] : null;
}

/**
 * 클립보드에서 URL을 읽어 바로 저장한다.
 * 뒷면 탭 딥링크, 위젯 등에서 사용.
 *
 * @param onNeedFallback URL이 없을 때 호출할 fallback (예: 모달 열기)
 * @param queryClient TanStack QueryClient (캐시 무효화용, 없으면 무효화 스킵)
 */
export async function quickSaveFromClipboard(options?: {
  onNeedFallback?: () => void;
  queryClient?: { invalidateQueries: (opts: { queryKey: string[] }) => void };
}): Promise<boolean> {
  // 1. 클립보드 읽기
  let clipboardText: string | null = null;
  try {
    clipboardText = await navigator.clipboard.readText();
  } catch {
    // 클립보드 접근 불가 (권한 거부 등)
  }

  if (!clipboardText) {
    options?.onNeedFallback?.();
    return false;
  }

  // 2. URL 추출
  const url = extractUrl(clipboardText);
  if (!url) {
    options?.onNeedFallback?.();
    return false;
  }

  // 3. 저장 API 호출
  const store = useUIStore.getState();
  store.incrementPendingSave();
  toast.info('링크 저장 중...', { duration: 2000 });

  try {
    const res = await fetch('/api/v1/clips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (res.status === 409) {
      store.failPendingSave();
      toast.warning('이미 저장된 링크입니다.');
      return false;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const msg = body?.error?.message ?? body?.error ?? '저장에 실패했습니다.';
      throw new Error(typeof msg === 'string' ? msg : '저장에 실패했습니다.');
    }

    store.completePendingSave();

    // 캐시 무효화
    const qc = options?.queryClient;
    if (qc) {
      qc.invalidateQueries({ queryKey: ['clips'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['credits'] });
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['credits'] });
      }, 12_000);
    }

    addNotification({
      type: 'clip_saved',
      title: '저장됨 — 콘텐츠 분석 중...',
      message: url,
    });
    toast.success('링크가 저장되었습니다!');
    return true;
  } catch (err: unknown) {
    store.failPendingSave();
    const message = err instanceof Error ? err.message : '저장에 실패했습니다.';
    toast.error(message);
    return false;
  }
}
