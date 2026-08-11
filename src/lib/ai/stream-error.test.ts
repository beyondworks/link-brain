import { describe, it, expect } from 'vitest';
import { encodeStreamError, parseStreamResult, STREAM_ERROR_MARKER } from './stream-error';

describe('parseStreamResult', () => {
  it('returns the text unchanged when there is no error', () => {
    expect(parseStreamResult('완성된 글입니다.')).toEqual({
      text: '완성된 글입니다.',
      error: null,
    });
  });

  it('splits body and error message when the stream failed midway', () => {
    const raw = '앞부분 본문' + encodeStreamError('rate limit exceeded');
    const result = parseStreamResult(raw);
    expect(result.text).toBe('앞부분 본문');
    expect(result.error).toBe('rate limit exceeded');
  });

  it('never leaves the marker in the visible text', () => {
    const raw = '본문' + encodeStreamError('네트워크 오류');
    expect(parseStreamResult(raw).text).not.toContain(STREAM_ERROR_MARKER);
  });

  it('handles an error with no body at all', () => {
    const result = parseStreamResult(encodeStreamError('API 키 없음'));
    expect(result.text).toBe('');
    expect(result.error).toBe('API 키 없음');
  });

  it('falls back to a generic message when the marker carries nothing', () => {
    expect(parseStreamResult(`본문${STREAM_ERROR_MARKER}`).error).toBe('알 수 없는 오류');
  });

  it('strips a nested marker out of the message', () => {
    const encoded = encodeStreamError(`bad${STREAM_ERROR_MARKER}thing`);
    expect(parseStreamResult(`x${encoded}`).error).toBe('badthing');
  });
});
