/**
 * API v1 - Explore
 *
 * GET /api/v1/explore - 공개 클립 목록 (인증 불필요)
 *
 * Explore는 익명 공개 라이브러리다. 저장한 사용자의 신원(user_id, author 등)은
 * 어떤 형태로도 응답에 포함하지 않는다 — user_id는 클립 간 상관관계를 만들 수 있는
 * 안정적 식별자이므로 비인증 호출자에게 절대 노출하지 않는다.
 *
 * Query params:
 *   category: 카테고리 이름 필터 (optional)
 *   search: 제목/요약 검색어 (optional)
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
  search: z.string().optional(),
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
  /** 같은 URL을 저장한 서로 다른 사용자 수 (집계값 — 신원 없음) */
  saveCount: number;
  views: number;
  category: string | null;
}

const db = supabaseAdmin;

/**
 * 한 페이지 분량의 URL에 대해 "몇 명이 저장했는지"를 한 번의 쿼리로 조회한다.
 * 실패해도 피드는 살아야 하므로 빈 맵으로 degrade.
 */
async function fetchSaveCounts(urls: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (urls.length === 0) return counts;

  // Plain select + JS distinct count (service role, identities never leave the
  // server). Kept RPC-free so it works without migration 034 applied.
  const { data, error } = await db
    .from('clips')
    .select('url, user_id')
    .in('url', urls);
  if (error) {
    console.error('[API v1 Explore] Popularity query error:', error);
    return counts;
  }

  const savers = new Map<string, Set<string>>();
  for (const row of (data ?? []) as { url: string; user_id: string }[]) {
    if (!savers.has(row.url)) savers.set(row.url, new Set());
    savers.get(row.url)!.add(row.user_id);
  }
  for (const [url, users] of savers) counts.set(url, users.size);
  return counts;
}

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

  const { category, search, sort, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  try {
    // trending: 최근 7일 기준
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
        views,
        categories!clips_category_id_fkey(name)
        `,
        { count: 'exact' }
      )
      .eq('is_public', true)
      .eq('is_archived', false);

    // 정렬 — 인기 신호는 views (실제로 증가하는 유일한 카운터)
    if (sort === 'popular') {
      query = query.order('views', { ascending: false }).order('created_at', { ascending: false });
    } else if (sort === 'trending') {
      query = query
        .gte('created_at', sevenDaysAgo)
        .order('views', { ascending: false })
        .order('created_at', { ascending: false });
    } else {
      // recent (default)
      query = query.order('created_at', { ascending: false });
    }

    // 검색: 제목/요약 부분 일치 (PostgREST ilike 와일드카드 이스케이프)
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[%_\\]/g, '\\$&');
      query = query.or(`title.ilike.%${escaped}%,summary.ilike.%${escaped}%`);
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

    const rows = (data as Record<string, unknown>[]) ?? [];
    const saveCounts = await fetchSaveCounts([
      ...new Set(rows.map((row) => row.url as string)),
    ]);

    const clips: ExploreClipResponse[] = rows.map((row) => {
      const catJoin = row.categories as { name: string } | null;
      const url = row.url as string;
      return {
        id: row.id as string,
        title: (row.title as string | null) ?? null,
        summary: (row.summary as string | null) ?? null,
        url,
        platform: row.platform as string,
        thumbnailUrl: (row.image as string | null) ?? null,
        createdAt: row.created_at as string,
        saveCount: saveCounts.get(url) ?? 0,
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
