/**
 * Tests for the CSV export helper logic.
 *
 * escapeCsvField and buildCsv are private to route.ts but their contract is
 * critical for data integrity, so we replicate the same logic here and verify
 * the expected RFC-4180 behaviour without needing to spin up the full route.
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Replicated helpers (mirrors the private functions in route.ts exactly)
// ---------------------------------------------------------------------------

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = Array.isArray(value) ? value.join(', ') : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

interface ExportClip {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  platform: string | null;
  tags: string[] | null;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  summary: string | null;
}

function buildCsv(clips: ExportClip[]): string {
  const headers = [
    'id', 'url', 'title', 'description', 'platform',
    'tags', 'is_favorite', 'is_archived', 'created_at', 'summary',
  ];
  const rows = clips.map((clip) =>
    headers.map((h) => escapeCsvField(clip[h as keyof ExportClip])).join(',')
  );
  return [headers.join(','), ...rows].join('\r\n');
}

// ---------------------------------------------------------------------------
// escapeCsvField
// ---------------------------------------------------------------------------

describe('escapeCsvField — plain values', () => {
  it('returns empty string for null', () => {
    expect(escapeCsvField(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('returns plain string unchanged when no special chars', () => {
    expect(escapeCsvField('hello world')).toBe('hello world');
  });

  it('returns boolean as string', () => {
    expect(escapeCsvField(true)).toBe('true');
    expect(escapeCsvField(false)).toBe('false');
  });
});

describe('escapeCsvField — fields requiring quoting', () => {
  it('wraps field in double-quotes when it contains a comma', () => {
    expect(escapeCsvField('foo,bar')).toBe('"foo,bar"');
  });

  it('wraps field in double-quotes when it contains a double-quote', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('escapes internal double-quotes by doubling them', () => {
    expect(escapeCsvField('a"b"c')).toBe('"a""b""c"');
  });

  it('wraps field in double-quotes when it contains a newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('wraps field in double-quotes when it contains a carriage-return', () => {
    expect(escapeCsvField('line1\rline2')).toBe('"line1\rline2"');
  });
});

describe('escapeCsvField — arrays', () => {
  it('joins array elements with ", " and wraps when joined string has comma', () => {
    const result = escapeCsvField(['tag1', 'tag2', 'tag3']);
    // joined = "tag1, tag2, tag3" which contains commas → must be quoted
    expect(result).toBe('"tag1, tag2, tag3"');
  });

  it('returns plain string for single-element array without special chars', () => {
    expect(escapeCsvField(['only'])).toBe('only');
  });

  it('returns empty string for empty array', () => {
    expect(escapeCsvField([])).toBe('');
  });
});

// ---------------------------------------------------------------------------
// buildCsv
// ---------------------------------------------------------------------------

describe('buildCsv', () => {
  const clip: ExportClip = {
    id: 'abc-123',
    url: 'https://example.com',
    title: 'My Clip',
    description: null,
    platform: 'web',
    tags: ['news', 'tech'],
    is_favorite: true,
    is_archived: false,
    created_at: '2024-01-15T10:00:00Z',
    summary: null,
  };

  it('first line is the header row', () => {
    const csv = buildCsv([clip]);
    const firstLine = csv.split('\r\n')[0];
    expect(firstLine).toBe('id,url,title,description,platform,tags,is_favorite,is_archived,created_at,summary');
  });

  it('produces one data row per clip', () => {
    const lines = buildCsv([clip, clip]).split('\r\n');
    // header + 2 data rows
    expect(lines).toHaveLength(3);
  });

  it('returns only header row for empty clip array', () => {
    const csv = buildCsv([]);
    expect(csv).toBe('id,url,title,description,platform,tags,is_favorite,is_archived,created_at,summary');
  });

  it('data row contains correct field values', () => {
    const csv = buildCsv([clip]);
    const dataRow = csv.split('\r\n')[1];
    expect(dataRow).toContain('abc-123');
    expect(dataRow).toContain('https://example.com');
    expect(dataRow).toContain('true');
    // tags array joined and quoted
    expect(dataRow).toContain('"news, tech"');
  });

  it('uses CRLF line endings', () => {
    const csv = buildCsv([clip]);
    expect(csv).toContain('\r\n');
    expect(csv).not.toMatch(/(?<!\r)\n/); // no bare LF
  });
});
