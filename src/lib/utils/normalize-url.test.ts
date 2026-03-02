import { describe, it, expect } from 'vitest';
import { normalizeUrl } from './normalize-url';

describe('normalizeUrl', () => {
  it('프로토콜을 제거한다 (https)', () => {
    expect(normalizeUrl('https://example.com')).toBe('example.com');
  });

  it('프로토콜을 제거한다 (http)', () => {
    expect(normalizeUrl('http://example.com')).toBe('example.com');
  });

  it('www.를 제거한다', () => {
    expect(normalizeUrl('https://www.example.com')).toBe('example.com');
  });

  it('trailing slash를 제거한다', () => {
    expect(normalizeUrl('https://example.com/path/')).toBe('example.com/path');
  });

  it('루트 trailing slash를 제거한다', () => {
    expect(normalizeUrl('https://example.com/')).toBe('example.com');
  });

  it('query params를 알파벳 순으로 정렬한다', () => {
    expect(normalizeUrl('https://example.com/path?b=2&a=1')).toBe(
      'example.com/path?a=1&b=2'
    );
  });

  it('이미 정렬된 query params는 그대로 유지한다', () => {
    expect(normalizeUrl('https://example.com?a=1&b=2')).toBe(
      'example.com?a=1&b=2'
    );
  });

  it('fragment(#)를 제거한다', () => {
    expect(normalizeUrl('https://example.com/path#section')).toBe(
      'example.com/path'
    );
  });

  it('fragment와 query가 함께 있을 때 둘 다 처리한다', () => {
    expect(normalizeUrl('https://example.com/path?a=1#section')).toBe(
      'example.com/path?a=1'
    );
  });

  it('종합 정규화: protocol + www + trailing slash + query params 정렬', () => {
    expect(
      normalizeUrl('https://www.example.com/path/?b=2&a=1')
    ).toBe('example.com/path?a=1&b=2');
  });

  it('path가 없는 URL도 처리한다', () => {
    expect(normalizeUrl('https://www.example.com')).toBe('example.com');
  });

  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeUrl('  https://example.com  ')).toBe('example.com');
  });

  it('빈 query string을 처리한다', () => {
    expect(normalizeUrl('https://example.com/path?')).toBe('example.com/path');
  });
});
