import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatRelativeTime, slugify, formatBytes } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });

  it('resolves tailwind merge conflicts (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('handles conditional class objects', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });

  it('handles array inputs', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });
});

describe('formatDate', () => {
  it('formats a Date object', () => {
    const date = new Date('2024-01-15T00:00:00Z');
    const result = formatDate(date);
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/1월/);
  });

  it('formats a date string', () => {
    const result = formatDate('2024-06-01T00:00:00Z');
    expect(result).toMatch(/2024/);
  });
});

describe('formatRelativeTime', () => {
  it('returns "방금 전" for times less than 60 seconds ago', () => {
    const now = new Date(Date.now() - 30 * 1000);
    expect(formatRelativeTime(now)).toBe('방금 전');
  });

  it('returns minutes for times less than 60 minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5분 전');
  });

  it('returns hours for times less than 24 hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo)).toBe('2시간 전');
  });

  it('returns days for times less than 7 days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo)).toBe('3일 전');
  });

  it('returns formatted date for times 7+ days ago', () => {
    const oldDate = new Date('2020-01-01T00:00:00Z');
    const result = formatRelativeTime(oldDate);
    expect(result).toMatch(/2020/);
  });
});

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('collapses multiple spaces', () => {
    expect(slugify('foo   bar')).toBe('foo-bar');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('respects decimals parameter', () => {
    expect(formatBytes(1536, 2)).toBe('1.5 KB');
  });
});
