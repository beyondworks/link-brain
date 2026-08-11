/**
 * API v1 - Insights
 *
 * GET /api/v1/insights?period=week|month|year
 *
 * Returns a consumption retrospective for the selected period (saved vs read
 * with a previous-period comparison, activity series, category/platform
 * distribution, reading debt) plus the all-time library tiles.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import {
  parsePeriod,
  resolvePeriodRange,
  periodGranularity,
  buildActivitySeries,
  changePercent,
  type InsightsPeriod,
  type InsightsGranularity,
  type ActivityBucket,
} from '@/lib/insights/period';
import { fetchPeriodStats, type DebtClip } from '@/lib/insights/period-stats';

export interface InsightsData {
  // ── selected period ──
  period: InsightsPeriod;
  granularity: InsightsGranularity;
  range: { from: string; to: string };
  periodStats: {
    saved: number;
    read: number;
    prevSaved: number;
    prevRead: number;
    savedChangePct: number | null;
    readChangePct: number | null;
  };
  activity: ActivityBucket[];
  categoryBreakdown: { name: string | null; count: number }[];
  platformBreakdown: { platform: string; count: number }[];
  readingDebt: { count: number; clips: DebtClip[] };

  // ── all-time library ──
  totalClips: number;
  totalFavorites: number;
  totalArchived: number;
  readRate: number;
  topTags: { name: string; count: number }[];
  aiAnalyzedCount: number;
  unanalyzedCount: number;
}

async function fetchTopTags(userId: string): Promise<{ name: string; count: number }[]> {
  const { data: clipRows } = await supabaseAdmin
    .from('clips')
    .select('id')
    .eq('user_id', userId)
    .eq('is_archived', false);

  const clipIds = ((clipRows ?? []) as { id: string }[]).map((r) => r.id);
  if (clipIds.length === 0) return [];

  const { data: clipTagRows } = await supabaseAdmin
    .from('clip_tags')
    .select('tag_id')
    .in('clip_id', clipIds.slice(0, 1000)); // cap to avoid URL length limit

  const tagRowsRaw = (clipTagRows ?? []) as { tag_id: string }[];
  if (tagRowsRaw.length === 0) return [];

  const tagIdCounts = new Map<string, number>();
  for (const { tag_id } of tagRowsRaw) {
    tagIdCounts.set(tag_id, (tagIdCounts.get(tag_id) ?? 0) + 1);
  }

  const { data: tagRows } = await supabaseAdmin
    .from('tags')
    .select('id, name')
    .in('id', [...tagIdCounts.keys()]);

  return ((tagRows ?? []) as { id: string; name: string }[])
    .map(({ id, name }) => ({ name, count: tagIdCounts.get(id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

async function handleGet(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const userId = auth.publicUserId;
  const period = parsePeriod(req.nextUrl.searchParams.get('period'));
  const range = resolvePeriodRange(period);

  try {
    const [
      totalResult,
      favoritesResult,
      archivedResult,
      readResult,
      aiAnalyzedResult,
      topTags,
      current,
      previous,
    ] = await Promise.all([
      supabaseAdmin
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_archived', false),

      supabaseAdmin
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_favorite', true)
        .eq('is_archived', false),

      supabaseAdmin
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_archived', true),

      supabaseAdmin
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_archived', false)
        .eq('is_read', true),

      supabaseAdmin
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_archived', false)
        .not('summary', 'is', null)
        .neq('summary', ''),

      fetchTopTags(userId),
      fetchPeriodStats(userId, range.from, range.to),
      fetchPeriodStats(userId, range.prevFrom, range.prevTo),
    ]);

    const totalClips = totalResult.count ?? 0;
    const readCount = readResult.count ?? 0;
    const aiAnalyzedCount = aiAnalyzedResult.count ?? 0;

    const data: InsightsData = {
      period,
      granularity: periodGranularity(period),
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      periodStats: {
        saved: current.saved,
        read: current.read,
        prevSaved: previous.saved,
        prevRead: previous.read,
        savedChangePct: changePercent(current.saved, previous.saved),
        readChangePct: changePercent(current.read, previous.read),
      },
      activity: buildActivitySeries(current.activity, period, range),
      categoryBreakdown: current.categories,
      platformBreakdown: current.platforms,
      readingDebt: { count: current.debtCount, clips: current.debtClips },

      totalClips,
      totalFavorites: favoritesResult.count ?? 0,
      totalArchived: archivedResult.count ?? 0,
      readRate: totalClips > 0 ? Math.round((readCount / totalClips) * 100) : 0,
      topTags,
      aiAnalyzedCount,
      unanalyzedCount: Math.max(0, totalClips - aiAnalyzedCount),
    };

    return sendSuccess(data);
  } catch (err) {
    console.error('[API v1 Insights] Error:', err);
    return errors.internalError();
  }
}

const routeHandler = withAuth(handleGet, { allowedMethods: ['GET'] });

export const GET = routeHandler;
export const OPTIONS = routeHandler;
