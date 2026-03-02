/**
 * 읽기 시간 추정 유틸
 * - 한국어: 500자/분
 * - 영어: 200단어/분
 * - 한글 포함 비율로 자동 판단 (30% 이상이면 한국어 기준 적용)
 */

const KOREAN_CHARS_PER_MINUTE = 500;
const ENGLISH_WORDS_PER_MINUTE = 200;
const KOREAN_RATIO_THRESHOLD = 0.3;

function countKoreanChars(text: string): number {
  // 한글 음절 범위: AC00–D7A3, 자모: 1100–11FF, 호환 자모: 3130–318F
  const koreanPattern = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/g;
  return (text.match(koreanPattern) ?? []).length;
}

export function estimateReadingTime(text: string): { minutes: number; words: number } {
  if (!text || text.trim().length === 0) {
    return { minutes: 0, words: 0 };
  }

  const totalChars = text.replace(/\s/g, '').length;
  const koreanChars = countKoreanChars(text);
  const koreanRatio = totalChars > 0 ? koreanChars / totalChars : 0;

  if (koreanRatio >= KOREAN_RATIO_THRESHOLD) {
    // 한국어 기준: 글자 수 기반
    const minutes = Math.max(1, Math.ceil(totalChars / KOREAN_CHARS_PER_MINUTE));
    return { minutes, words: totalChars };
  }

  // 영어 기준: 단어 수 기반
  const wordCount = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const minutes = Math.max(1, Math.ceil(wordCount / ENGLISH_WORDS_PER_MINUTE));
  return { minutes, words: wordCount };
}
