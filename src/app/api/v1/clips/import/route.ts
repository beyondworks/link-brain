/**
 * API v1 - Clips Import
 *
 * POST /api/v1/clips/import  — import clips from JSON or CSV file upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import { checkClipLimit } from '@/lib/services/plan-service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

interface ImportRow {
  url: string;
  title?: string | null;
  description?: string | null;
  tags?: string | null;
  is_favorite?: string | boolean | null;
  is_archived?: string | boolean | null;
}

interface ClipInsert {
  user_id: string;
  url: string;
  title: string | null;
  description: string | null;
  tags: string[];
  is_favorite: boolean;
  is_archived: boolean;
}

interface ImportStats {
  imported: number;
  skipped: number;
  errors: number;
}

function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseBool(value: string | boolean | null | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return false;
  const lower = String(value).toLowerCase().trim();
  return lower === 'true' || lower === '1' || lower === 'yes';
}

function parseTags(value: string | null | undefined): string[] {
  if (!value || !String(value).trim()) return [];
  return String(value)
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Parse CSV text into an array of row objects keyed by header columns.
 * Handles RFC 4180 quoted fields (commas and newlines inside quotes).
 */
function parseCsv(text: string): ImportRow[] {
  // Normalize line endings
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const ch = line[i];

      if (inQuotes) {
        if (ch === '"') {
          // Peek ahead for escaped double-quote
          if (line[i + 1] === '"') {
            current += '"';
            i += 2;
          } else {
            inQuotes = false;
            i++;
          }
        } else {
          current += ch;
          i++;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
          i++;
        } else if (ch === ',') {
          fields.push(current);
          current = '';
          i++;
        } else {
          current += ch;
          i++;
        }
      }
    }
    fields.push(current);
    return fields;
  };

  const lines = normalised.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseRow(lines[0]).map((h) => h.trim().toLowerCase());

  const rows: ImportRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const values = parseRow(lines[r]);
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] ?? '';
    });
    rows.push({
      url: obj['url'] ?? '',
      title: obj['title'] ?? null,
      description: obj['description'] ?? null,
      tags: obj['tags'] ?? null,
      is_favorite: obj['is_favorite'] ?? null,
      is_archived: obj['is_archived'] ?? null,
    });
  }

  return rows;
}

/**
 * Parse JSON file content into ImportRow array.
 */
function parseJson(text: string): ImportRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('JSON must be an array');
  }

  return parsed.map((item: unknown) => {
    if (typeof item !== 'object' || item === null) return { url: '' };
    const record = item as Record<string, unknown>;
    return {
      url: typeof record['url'] === 'string' ? record['url'] : '',
      title: typeof record['title'] === 'string' ? record['title'] : null,
      description: typeof record['description'] === 'string' ? record['description'] : null,
      tags:
        Array.isArray(record['tags'])
          ? (record['tags'] as unknown[]).filter((t) => typeof t === 'string').join(',')
          : typeof record['tags'] === 'string'
          ? record['tags']
          : null,
      is_favorite: record['is_favorite'] as boolean | string | null | undefined,
      is_archived: record['is_archived'] as boolean | string | null | undefined,
    };
  });
}

async function handleImport(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return errors.invalidRequest('Multipart form data required');
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return errors.invalidRequest('Missing "file" field in form data');
  }

  const fileName = file.name.toLowerCase();
  const contentType = file.type.toLowerCase();

  const isJson =
    fileName.endsWith('.json') ||
    contentType.includes('application/json') ||
    contentType.includes('text/json');

  const isCsv =
    fileName.endsWith('.csv') ||
    contentType.includes('text/csv') ||
    contentType.includes('application/csv');

  if (!isJson && !isCsv) {
    return errors.invalidRequest('File must be .json or .csv');
  }

  const text = await file.text();

  let rows: ImportRow[];
  try {
    rows = isJson ? parseJson(text) : parseCsv(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to parse file';
    return errors.invalidRequest(msg);
  }

  if (rows.length === 0) {
    return sendSuccess<ImportStats>({ imported: 0, skipped: 0, errors: 0 });
  }

  // Check plan clip limit before inserting
  const clipLimit = await checkClipLimit(auth.publicUserId);
  if (!clipLimit.allowed) {
    return errors.planLimitReached('clip', clipLimit.used ?? 0, clipLimit.limit ?? 0);
  }

  // Fetch existing URLs for this user to detect duplicates
  const { data: existing } = (await db
    .from('clips')
    .select('url')
    .eq('user_id', auth.publicUserId)) as { data: { url: string }[] | null };

  const existingUrls = new Set((existing ?? []).map((r) => r.url));

  const toInsert: ClipInsert[] = [];
  let skipped = 0;
  let parseErrors = 0;

  for (const row of rows) {
    const url = row.url?.trim();

    if (!url || !isValidUrl(url)) {
      parseErrors++;
      continue;
    }

    if (existingUrls.has(url)) {
      skipped++;
      continue;
    }

    // Add to set so within-batch duplicates are also skipped
    existingUrls.add(url);

    toInsert.push({
      user_id: auth.publicUserId,
      url,
      title: row.title?.trim() || null,
      description: row.description?.trim() || null,
      tags: parseTags(row.tags),
      is_favorite: parseBool(row.is_favorite),
      is_archived: parseBool(row.is_archived),
    });
  }

  // Truncate to remaining plan slots so we never exceed the limit
  if (clipLimit.limit !== undefined) {
    const remaining = clipLimit.limit - (clipLimit.used ?? 0);
    if (remaining > 0 && toInsert.length > remaining) {
      skipped += toInsert.length - remaining;
      toInsert.splice(remaining);
    }
  }

  let imported = 0;

  if (toInsert.length > 0) {
    // Batch insert in chunks of 100
    const CHUNK_SIZE = 100;
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE);
      const { error, data } = await db.from('clips').insert(chunk).select('id');

      if (error) {
        console.error('[Import] Supabase insert error:', error);
        parseErrors += chunk.length;
      } else {
        imported += (data as unknown[]).length;
      }
    }
  }

  return sendSuccess<ImportStats>({ imported, skipped, errors: parseErrors });
}

const routeHandler = withAuth(
  async (req, auth) => handleImport(req, auth),
  { allowedMethods: ['POST'] }
);

export const POST = routeHandler;
export const OPTIONS = routeHandler;
