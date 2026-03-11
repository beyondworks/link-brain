/**
 * API v1 - Insights
 *
 * GET /api/v1/insights  - Server-side aggregated stats for the insights page
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';

export interface InsightsData {
  totalClips: number;
  totalFavorites: number;
  totalArchived: number;
  readRate: number;
  platformBreakdown: { platform: string; count: number }[];
  recentActivity: { date: string; count: number }[];
  topTags: { name: string; count: number }[];
  aiAnalyzedCount: number;
  unanalyzedCount: number;
}

async function handleGet(_req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const userId = auth.publicUserId;

  try {
    // Run independent count queries in parallel
    const [
      totalResult,
      favoritesResult,
      archivedResult,
      readResult,
      aiAnalyzedResult,
      platformResult,
      recentResult,
      tagsResult,
    ] = await Promise.all([
      // Total clips (non-archived)
      supabaseAdmin
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_archived', false),

      // Total favorites
      supabaseAdmin
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_favorite', true)
        .eq('is_archived', false),

      // Total archived
      supabaseAdmin
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_archived', true),

      // Read clips (is_read = true)
      supabaseAdmin
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_archived', false)
        .eq('is_read', true),

      // AI analyzed clips (non-null summary)
      supabaseAdmin
        .from('clips')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_archived', false)
        .not('summary', 'is', null)
        .neq('summary', ''),

      // Platform breakdown
      supabaseAdmin
        .from('clips')
        .select('platform')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .not('platform', 'is', null),

      // Recent activity: clips from last 30 days
      supabaseAdmin
        .from('clips')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true }),

      // User's clip IDs for tag lookup
      supabaseAdmin
        .from('clips')
        .select('id')
        .eq('user_id', userId)
        .eq('is_archived', false),
    ]);

    const totalClips = totalResult.count ?? 0;
    const totalFavorites = favoritesResult.count ?? 0;
    const totalArchived = archivedResult.count ?? 0;
    const readCount = readResult.count ?? 0;
    const aiAnalyzedCount = aiAnalyzedResult.count ?? 0;
    const unanalyzedCount = Math.max(0, totalClips - aiAnalyzedCount);

    // Top tags: two-step (clip_tags has no FK relationships defined)
    const clipIds = ((tagsResult.data ?? []) as { id: string }[]).map((r) => r.id);
    let topTags: { name: string; count: number }[] = [];
    if (clipIds.length > 0) {
      const { data: clipTagRows } = await supabaseAdmin
        .from('clip_tags')
        .select('tag_id')
        .in('clip_id', clipIds.slice(0, 1000)); // cap to avoid URL length limit

      if (clipTagRows && clipTagRows.length > 0) {
        const tagIds = [...new Set((clipTagRows as { tag_id: string }[]).map((r) => r.tag_id))];
        const tagIdCounts = new Map<string, number>();
        for (const { tag_id } of clipTagRows as { tag_id: string }[]) {
          tagIdCounts.set(tag_id, (tagIdCounts.get(tag_id) ?? 0) + 1);
        }

        const { data: tagRows } = await supabaseAdmin
          .from('tags')
          .select('id, name')
          .in('id', tagIds);

        if (tagRows) {
          topTags = (tagRows as { id: string; name: string }[])
            .map(({ id, name }) => ({ name, count: tagIdCounts.get(id) ?? 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        }
      }
    }

    // Read rate: percentage of non-archived clips marked as read
    const readRate = totalClips > 0 ? Math.round((readCount / totalClips) * 100) : 0;

    // Platform breakdown: group and count
    const platformMap = new Map<string, number>();
    if (platformResult.data) {
      for (const row of platformResult.data as { platform: string | null }[]) {
        if (row.platform) {
          platformMap.set(row.platform, (platformMap.get(row.platform) ?? 0) + 1);
        }
      }
    }
    const platformBreakdown = Array.from(platformMap.entries())
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Daily activity for the last 30 days
    const activityMap = new Map<string, number>();
    if (recentResult.data) {
      for (const row of recentResult.data as { created_at: string }[]) {
        const date = row.created_at.slice(0, 10); // YYYY-MM-DD
        activityMap.set(date, (activityMap.get(date) ?? 0) + 1);
      }
    }
    // Fill in all 30 days (including zeros)
    const recentActivity: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      recentActivity.push({ date: dateStr, count: activityMap.get(dateStr) ?? 0 });
    }

    const data: InsightsData = {
      totalClips,
      totalFavorites,
      totalArchived,
      readRate,
      platformBreakdown,
      recentActivity,
      topTags,
      aiAnalyzedCount,
      unanalyzedCount,
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
