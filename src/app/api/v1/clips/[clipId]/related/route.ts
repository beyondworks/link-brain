/**
 * API v1 - Related Clips
 *
 * GET /api/v1/clips/[clipId]/related
 * pgvector 코사인 유사도 기반 관련 클립 검색
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import type { ClipData } from '@/types/database';

type RouteContext = { params: Promise<{ clipId: string }> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export interface RelatedClip {
  id: string;
  title: string | null;
  url: string;
  image: string | null;
  platform: string | null;
  summary: string | null;
  similarity: number;
}

async function handleGet(
  _req: NextRequest,
  auth: AuthContext,
  clipId: string
): Promise<NextResponse> {
  // 원본 클립 존재 및 소유 확인
  const { data: clip, error: clipErr } = await db
    .from('clips')
    .select('id, user_id, platform')
    .eq('id', clipId)
    .single();

  if (clipErr || !clip) return errors.notFound('clip');
  if ((clip as Pick<ClipData, 'user_id'>).user_id !== auth.userId) return errors.accessDenied();

  const sourceClip = clip as Pick<ClipData, 'id' | 'user_id' | 'platform'>;

  // pgvector RPC 시도
  const { data: rpcData, error: rpcErr } = await db.rpc('find_related_clips', {
    p_clip_id: clipId,
    p_user_id: auth.userId,
    p_limit: 5,
    p_min_similarity: 0.7,
  });

  if (!rpcErr && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
    const related: RelatedClip[] = (rpcData as Array<{
      id: string;
      title: string | null;
      url: string;
      image: string | null;
      platform: string | null;
      summary: string | null;
      similarity: number;
    }>).map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      image: row.image,
      platform: row.platform,
      summary: row.summary,
      similarity: row.similarity,
    }));

    return sendSuccess(related);
  }

  // Fallback: 같은 platform 클립
  const { data: fallbackData, error: fallbackErr } = await db
    .from('clips')
    .select('id, title, url, image, platform, summary')
    .eq('user_id', auth.userId)
    .eq('platform', sourceClip.platform ?? 'web')
    .neq('id', clipId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(5);

  if (fallbackErr) {
    console.error('[API v1 Related] Fallback error:', fallbackErr);
    return errors.internalError();
  }

  const related: RelatedClip[] = ((fallbackData as Array<Pick<ClipData, 'id' | 'title' | 'url' | 'image' | 'platform' | 'summary'>>) ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    image: row.image,
    platform: row.platform,
    summary: row.summary,
    similarity: 0,
  }));

  return sendSuccess(related);
}

const routeHandler = withAuth(
  async (req, auth, params) => {
    const clipId = params?.clipId ?? '';
    if (!clipId) return errors.invalidRequest('Clip ID is required');
    return handleGet(req, auth, clipId);
  },
  { allowedMethods: ['GET'] }
);

export async function GET(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function OPTIONS(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}
