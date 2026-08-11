/**
 * Period aggregates for the insights page.
 *
 * Primary path: the get_insights_stats RPC (one round trip, see
 * supabase/migrations/035_insights_aggregates.sql).
 * Fallback path: plain queries, used while the migration is not applied yet or
 * if the RPC errors. The fallback is capped (see FALLBACK_ROW_CAP) and can
 * under-report on very large windows — the RPC is the accurate path.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { DailyActivityRow } from './period';

export interface DebtClip {
  id: string;
  title: string | null;
  createdAt: string;
  platform: string | null;
}

export interface PeriodStats {
  saved: number;
  read: number;
  activity: DailyActivityRow[];
  categories: { name: string | null; count: number }[];
  platforms: { platform: string; count: number }[];
  debtCount: number;
  debtClips: DebtClip[];
}

const FALLBACK_ROW_CAP = 2000;

// ─── unknown → typed parsing (no `any`) ─────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parsePeriodStats(payload: unknown): PeriodStats | null {
  if (!isRecord(payload)) return null;

  return {
    saved: num(payload.saved),
    read: num(payload.read),
    activity: arr(payload.activity).flatMap((row) => {
      if (!isRecord(row)) return [];
      const date = str(row.date);
      return date ? [{ date, saved: num(row.saved), read: num(row.read) }] : [];
    }),
    categories: arr(payload.categories).flatMap((row) =>
      isRecord(row) ? [{ name: str(row.name), count: num(row.count) }] : []
    ),
    platforms: arr(payload.platforms).flatMap((row) => {
      if (!isRecord(row)) return [];
      const platform = str(row.platform);
      return platform ? [{ platform, count: num(row.count) }] : [];
    }),
    debtCount: num(payload.debtCount),
    debtClips: arr(payload.debtClips).flatMap((row) => {
      if (!isRecord(row)) return [];
      const id = str(row.id);
      const createdAt = str(row.created_at);
      return id && createdAt
        ? [{ id, title: str(row.title), createdAt, platform: str(row.platform) }]
        : [];
    }),
  };
}

// ─── public API ─────────────────────────────────────────────────────────────

export async function fetchPeriodStats(
  userId: string,
  from: Date,
  to: Date
): Promise<PeriodStats> {
  const { data, error } = await supabaseAdmin.rpc('get_insights_stats', {
    p_user_id: userId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (!error) {
    const parsed = parsePeriodStats(data);
    if (parsed) return parsed;
  }

  return fetchPeriodStatsFallback(userId, from, to);
}

// ─── fallback ───────────────────────────────────────────────────────────────

interface SavedRow {
  id: string;
  title: string | null;
  created_at: string;
  platform: string | null;
  category_id: string | null;
  is_read: boolean;
}

async function fetchPeriodStatsFallback(
  userId: string,
  from: Date,
  to: Date
): Promise<PeriodStats> {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const [savedRes, progressInRangeRes, allProgressRes, legacyReadRes] = await Promise.all([
    supabaseAdmin
      .from('clips')
      .select('id, title, created_at, platform, category_id, is_read')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .eq('is_hidden', false)
      .gte('created_at', fromIso)
      .lt('created_at', toIso)
      .order('created_at', { ascending: false })
      .limit(FALLBACK_ROW_CAP),

    supabaseAdmin
      .from('reading_progress')
      .select('clip_id, last_read_at')
      .eq('user_id', userId)
      .gte('last_read_at', fromIso)
      .lt('last_read_at', toIso)
      .limit(FALLBACK_ROW_CAP),

    supabaseAdmin
      .from('reading_progress')
      .select('clip_id')
      .eq('user_id', userId)
      .limit(FALLBACK_ROW_CAP * 5),

    supabaseAdmin
      .from('clips')
      .select('id, updated_at')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .eq('is_hidden', false)
      .eq('is_read', true)
      .gte('updated_at', fromIso)
      .lt('updated_at', toIso)
      .limit(FALLBACK_ROW_CAP),
  ]);

  const savedRows = (savedRes.data ?? []) as SavedRow[];
  const progressInRange = (progressInRangeRes.data ?? []) as {
    clip_id: string;
    last_read_at: string;
  }[];
  const clipsWithProgress = new Set(
    ((allProgressRes.data ?? []) as { clip_id: string }[]).map((r) => r.clip_id)
  );
  // clips.updated_at only counts when the clip has no progress row at all —
  // otherwise an unrelated edit would be counted as a read.
  const legacyRead = ((legacyReadRes.data ?? []) as { id: string; updated_at: string }[]).filter(
    (r) => !clipsWithProgress.has(r.id)
  );

  // Activity: merge saved days and read days
  const daily = new Map<string, { saved: number; read: number }>();
  const bump = (iso: string, key: 'saved' | 'read') => {
    const day = iso.slice(0, 10);
    const entry = daily.get(day) ?? { saved: 0, read: 0 };
    entry[key] += 1;
    daily.set(day, entry);
  };
  for (const row of savedRows) bump(row.created_at, 'saved');
  for (const row of progressInRange) bump(row.last_read_at, 'read');
  for (const row of legacyRead) bump(row.updated_at, 'read');

  // Category names for the saved rows
  const categoryIds = [
    ...new Set(savedRows.map((r) => r.category_id).filter((id): id is string => !!id)),
  ];
  const categoryNames = new Map<string, string>();
  if (categoryIds.length > 0) {
    const { data: catRows } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .in('id', categoryIds);
    for (const row of (catRows ?? []) as { id: string; name: string }[]) {
      categoryNames.set(row.id, row.name);
    }
  }

  const categoryCounts = new Map<string | null, number>();
  const platformCounts = new Map<string, number>();
  for (const row of savedRows) {
    const name = row.category_id ? (categoryNames.get(row.category_id) ?? null) : null;
    categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
    if (row.platform) {
      platformCounts.set(row.platform, (platformCounts.get(row.platform) ?? 0) + 1);
    }
  }

  const debtRows = savedRows
    .filter((row) => !row.is_read && !clipsWithProgress.has(row.id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return {
    saved: savedRows.length,
    read: progressInRange.length + legacyRead.length,
    activity: [...daily.entries()]
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    categories: [...categoryCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    platforms: [...platformCounts.entries()]
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    debtCount: debtRows.length,
    debtClips: debtRows.slice(0, 5).map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      platform: row.platform,
    })),
  };
}
