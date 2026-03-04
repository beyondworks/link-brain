/**
 * API v1 - Weekly Stats
 *
 * GET /api/v1/stats/weekly
 * 이번 주 vs 지난 주 활동 통계 비교를 반환합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface WeeklyMetric {
  thisWeek: number;
  lastWeek: number;
}

export interface WeeklyStatsData {
  clips_saved: WeeklyMetric;
  clips_read: WeeklyMetric;
  highlights_made: WeeklyMetric;
  collections_updated: WeeklyMetric;
  weekStart: string;
  lastWeekStart: string;
}

function getWeekBoundaries(): {
  thisWeekStart: Date;
  lastWeekStart: Date;
  lastWeekEnd: Date;
} {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=일, 1=월 ... 6=토
  // 이번 주 월요일 00:00:00 UTC 기준
  const daysFromMonday = (dayOfWeek + 6) % 7;
  const thisWeekStart = new Date(now);
  thisWeekStart.setUTCHours(0, 0, 0, 0);
  thisWeekStart.setUTCDate(thisWeekStart.getUTCDate() - daysFromMonday);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);

  const lastWeekEnd = new Date(thisWeekStart);

  return { thisWeekStart, lastWeekStart, lastWeekEnd };
}

async function countRows(
  table: string,
  userId: string,
  dateColumn: string,
  gte: string,
  lt?: string
): Promise<number> {
  try {
    let query = supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte(dateColumn, gte);

    if (lt) {
      query = query.lt(dateColumn, lt);
    }

    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function handleGetWeeklyStats(
  _req: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  const { thisWeekStart, lastWeekStart, lastWeekEnd } = getWeekBoundaries();

  const thisWeekIso = thisWeekStart.toISOString();
  const lastWeekIso = lastWeekStart.toISOString();
  const lastWeekEndIso = lastWeekEnd.toISOString();

  const [
    clipsSavedThis,
    clipsSavedLast,
    clipsReadThis,
    clipsReadLast,
    highlightsThis,
    highlightsLast,
    collectionsThis,
    collectionsLast,
  ] = await Promise.all([
    // clips_saved: clips 테이블 created_at 기준
    countRows('clips', auth.publicUserId, 'created_at', thisWeekIso),
    countRows('clips', auth.publicUserId, 'created_at', lastWeekIso, lastWeekEndIso),

    // clips_read: clips 테이블 updated_at 기준, is_read=true
    // updated_at이 이번 주이고 is_read=true인 항목
    (async () => {
      try {
        const { count, error } = await supabaseAdmin
          .from('clips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.publicUserId)
          .eq('is_read', true)
          .gte('updated_at', thisWeekIso);
        if (error) return 0;
        return count ?? 0;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const { count, error } = await supabaseAdmin
          .from('clips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.publicUserId)
          .eq('is_read', true)
          .gte('updated_at', lastWeekIso)
          .lt('updated_at', lastWeekEndIso);
        if (error) return 0;
        return count ?? 0;
      } catch {
        return 0;
      }
    })(),

    // highlights_made: annotations 테이블 created_at 기준
    countRows('annotations', auth.publicUserId, 'created_at', thisWeekIso),
    countRows('annotations', auth.publicUserId, 'created_at', lastWeekIso, lastWeekEndIso),

    // collections_updated: collections 테이블 updated_at 기준
    (async () => {
      try {
        const { count, error } = await supabaseAdmin
          .from('collections')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.publicUserId)
          .gte('updated_at', thisWeekIso);
        if (error) return 0;
        return count ?? 0;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const { count, error } = await supabaseAdmin
          .from('collections')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.publicUserId)
          .gte('updated_at', lastWeekIso)
          .lt('updated_at', lastWeekEndIso);
        if (error) return 0;
        return count ?? 0;
      } catch {
        return 0;
      }
    })(),
  ]);

  const data: WeeklyStatsData = {
    clips_saved: { thisWeek: clipsSavedThis, lastWeek: clipsSavedLast },
    clips_read: { thisWeek: clipsReadThis, lastWeek: clipsReadLast },
    highlights_made: { thisWeek: highlightsThis, lastWeek: highlightsLast },
    collections_updated: { thisWeek: collectionsThis, lastWeek: collectionsLast },
    weekStart: thisWeekIso,
    lastWeekStart: lastWeekIso,
  };

  return sendSuccess(data);
}

const routeHandler = withAuth(
  async (req, auth) => {
    if (req.method === 'GET') return handleGetWeeklyStats(req, auth);
    return NextResponse.json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }, { status: 405 });
  },
  { allowedMethods: ['GET'] }
);

export const GET = routeHandler;
export const OPTIONS = routeHandler;
