/**
 * API v1 - Explore
 *
 * GET /api/v1/explore - 공개 클립 목록 (인증 불필요)
 *
 * Query params:
 *   category: 카테고리 이름 필터 (optional)
 *   sort: 'recent' | 'popular' | 'trending' (default: 'recent')
 *   page: 페이지 번호 (default: 1)
 *   limit: 페이지당 항목 수 (default: 20, max: 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendPaginated, errors } from '@/lib/api/response';
import { corsHeaders, handleCorsPreflightResponse } from '@/lib/api/cors';
import { z } from 'zod';

const exploreQuerySchema = z.object({
  category: z.string().optional(),
  sort: z.enum(['recent', 'popular', 'trending']).default('recent'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export interface ExploreClipResponse {
  id: string;
  title: string | null;
  summary: string | null;
  url: string;
  platform: string;
  thumbnailUrl: string | null;
  createdAt: string;
  userId: string;
  likesCount: number;
  views: number;
  category: string | null;
}

const db = supabaseAdmin;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflightResponse(origin) as NextResponse;
  }

  // Parse query params
  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    raw[key] = value;
  });

  const parsed = exploreQuerySchema.safeParse(raw);
  if (!parsed.success) {
    const res = errors.invalidRequest('Invalid query parameters');
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  const { category, sort, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  try {
    // trending: 최근 7일 기준 최신순
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let query = db
      .from('clips')
      .select(
        `
        id,
        title,
        summary,
        url,
        platform,
        image,
        created_at,
        user_id,
        likes_count,
        views,
        categories!clips_category_id_fkey(name)
        `,
        { count: 'exact' }
      )
      .eq('is_public', true)
      .eq('is_archived', false);

    // 정렬
    if (sort === 'popular') {
      query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
    } else if (sort === 'trending') {
      query = query
        .gte('created_at', sevenDaysAgo)
        .order('likes_count', { ascending: false })
        .order('created_at', { ascending: false });
    } else {
      // recent (default)
      query = query.order('created_at', { ascending: false });
    }

    // 카테고리 필터: categories join으로 이름 매칭
    if (category && category !== 'all') {
      // categories 테이블에서 해당 이름의 id 목록 조회
      const { data: catRows } = await db
        .from('categories')
        .select('id')
        .ilike('name', category);

      const catIds = ((catRows as { id: string }[]) ?? []).map((r) => r.id);
      if (catIds.length === 0) {
        // 해당 카테고리 없음 → 빈 결과
        const res = sendPaginated([], 0, limit, offset);
        Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }
      query = query.in('category_id', catIds);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[API v1 Explore] Query error:', error);
      const res = errors.internalError();
      Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    const clips = ((data as Record<string, unknown>[]) ?? []).map((row) => {
      const catJoin = row.categories as { name: string } | null;
      return {
        id: row.id,
        title: row.title,
        summary: row.summary,
        url: row.url,
        platform: row.platform,
        thumbnailUrl: row.image,
        createdAt: row.created_at,
        userId: row.user_id,
        likesCount: (row.likes_count as number) ?? 0,
        views: (row.views as number) ?? 0,
        category: catJoin?.name ?? null,
      };
    });

    const res = sendPaginated(clips, count ?? 0, limit, offset);
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (err) {
    console.error('[API v1 Explore] Error:', err);
    const res = errors.internalError();
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return handleCorsPreflightResponse(req.headers.get('origin')) as NextResponse;
}
