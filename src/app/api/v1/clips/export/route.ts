/**
 * API v1 - Clips Export
 *
 * GET /api/v1/clips/export?format=json  — download all clips as JSON
 * GET /api/v1/clips/export?format=csv   — download all clips as CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { errors } from '@/lib/api/response';
import { checkFeatureAccess } from '@/lib/services/plan-service';

const db = supabaseAdmin;

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

/**
 * Escape a single CSV field per RFC 4180.
 * Wraps field in double-quotes if it contains commas, quotes, or newlines.
 */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = Array.isArray(value) ? value.join(', ') : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(clips: ExportClip[]): string {
  const headers = [
    'id',
    'url',
    'title',
    'description',
    'platform',
    'tags',
    'is_favorite',
    'is_archived',
    'created_at',
    'summary',
  ];

  const rows = clips.map((clip) =>
    headers
      .map((h) => escapeCsvField(clip[h as keyof ExportClip]))
      .join(',')
  );

  return [headers.join(','), ...rows].join('\r\n');
}

async function handleExport(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const featureCheck = await checkFeatureAccess(auth.publicUserId, 'export');
  if (!featureCheck.allowed) {
    return errors.featureNotAvailable('export');
  }

  const format = req.nextUrl.searchParams.get('format') ?? 'json';

  if (format !== 'json' && format !== 'csv') {
    return errors.invalidRequest('format must be "json" or "csv"');
  }

  const { data, error } = await db
    .from('clips')
    .select('id, url, title, description, platform, tags, is_favorite, is_archived, created_at, summary' as '*')
    .eq('user_id', auth.publicUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Export] Supabase error:', error);
    return errors.internalError();
  }

  const clips = (data ?? []) as unknown as ExportClip[];
  const date = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    const csv = buildCsv(clips);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="linkbrain-clips-${date}.csv"`,
      },
    });
  }

  // JSON
  const json = JSON.stringify(clips, null, 2);
  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="linkbrain-clips-${date}.json"`,
    },
  });
}

const routeHandler = withAuth(
  async (req, auth) => handleExport(req, auth),
  { allowedMethods: ['GET'] }
);

export const GET = routeHandler;
export const OPTIONS = routeHandler;
