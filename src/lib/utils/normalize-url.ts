/**
 * URL 정규화 유틸리티
 *
 * 같은 URL의 중복 감지를 위해 URL을 표준 형태로 변환합니다.
 * https://www.example.com/path/?b=2&a=1 → example.com/path?a=1&b=2
 */

/**
 * URL을 정규화합니다.
 * - protocol(https://, http://) 제거
 * - www. 제거
 * - trailing slash 제거
 * - query params 알파벳 순 정렬
 * - fragment(#) 제거
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim();

  // 프로토콜 제거
  normalized = normalized.replace(/^https?:\/\//, '');

  // www. 제거
  normalized = normalized.replace(/^www\./, '');

  // fragment(#...) 제거
  const hashIndex = normalized.indexOf('#');
  if (hashIndex !== -1) {
    normalized = normalized.slice(0, hashIndex);
  }

  // query string 분리 및 정렬
  const queryIndex = normalized.indexOf('?');
  if (queryIndex !== -1) {
    const base = normalized.slice(0, queryIndex);
    const queryStr = normalized.slice(queryIndex + 1);

    // 빈 query string이면 그냥 base 반환
    if (!queryStr) {
      return removeTrailingSlash(base);
    }

    // query params 정렬
    const params = queryStr
      .split('&')
      .filter((p) => p.length > 0)
      .sort();

    return removeTrailingSlash(base) + '?' + params.join('&');
  }

  return removeTrailingSlash(normalized);
}

function removeTrailingSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}
