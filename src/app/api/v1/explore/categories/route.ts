/**
 * GET /api/v1/explore/categories
 *
 * 탐색 필터 칩용 — 공개 클립이 실제로 속한 카테고리 상위 목록.
 * (하드코딩 목록은 실데이터의 카테고리 이름과 매칭되지 않아 항상 빈 필터였다.)
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendSuccess, errors } from '@/lib/api/response';

const TOP_N = 10;

export async function GET(): Promise<NextResponse> {
  try {
    const { data, error } = await supabaseAdmin
      .from('clips')
      .select('categories!clips_category_id_fkey(name)')
      .eq('is_public', true)
      .eq('is_archived', false)
      .not('category_id', 'is', null);

    if (error) {
      console.error('[API v1 Explore Categories] Query error:', error);
      return errors.internalError();
    }

    const counts = new Map<string, number>();
    for (const row of (data ?? []) as unknown as { categories: { name: string } | null }[]) {
      const name = row.categories?.name?.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    const categories = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([name, count]) => ({ name, count }));

    const res = sendSuccess({ categories });
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res;
  } catch (err) {
    console.error('[API v1 Explore Categories] Error:', err);
    return errors.internalError();
  }
}
