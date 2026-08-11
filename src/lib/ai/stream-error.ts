/**
 * 스트리밍 중 발생한 오류를 본문과 구분해 전달하기 위한 마커.
 *
 * 스트림은 이미 200 OK + 헤더가 나간 뒤라 상태 코드를 바꿀 수 없다.
 * 그래서 본문 끝에 마커를 붙여 보내고, 클라이언트는 마커를 만나면
 * "실패한 생성"으로 처리한다 (토스트 표시, DB 저장 금지).
 */
export const STREAM_ERROR_MARKER = '⟦LB_STREAM_ERROR⟧';

export interface StreamResult {
  /** 마커 이전의 본문 */
  text: string;
  /** 오류 메시지 (오류 없으면 null) */
  error: string | null;
}

export function encodeStreamError(message: string): string {
  return `\n${STREAM_ERROR_MARKER}${message.split(STREAM_ERROR_MARKER).join('')}`;
}

export function parseStreamResult(raw: string): StreamResult {
  const idx = raw.indexOf(STREAM_ERROR_MARKER);
  if (idx === -1) return { text: raw, error: null };
  return {
    text: raw.slice(0, idx).trimEnd(),
    error: raw.slice(idx + STREAM_ERROR_MARKER.length).trim() || '알 수 없는 오류',
  };
}
