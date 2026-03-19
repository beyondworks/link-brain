/**
 * API v1 - Clip Duplicates
 *
 * GET /api/v1/clips/duplicates
 * 현재 사용자의 중복 클립 그룹을 반환합니다.
 * URL 정규화 후 동일한 normalized_url을 가진 클립들을 그룹화합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import { normalizeUrl } from '@/lib/utils/normalize-url';
import type { ClipData } from '@/types/database';

export interface DuplicateGroup {
  normalizedUrl: string;
  clips: ClipData[];
}

export interface DuplicatesResponse {
  groups: DuplicateGroup[];
  totalDuplicates: number;
}

const db = supabaseAdmin;

async function handleGetDuplicates(
  _req: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  try {
    // 사용자의 모든 비아카이브 클립 조회
    const { data, error } = await db
      .from('clips')
      .select('*')
      .eq('user_id', auth.publicUserId)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API v1 Duplicates] Query error:', error);
      return errors.internalError();
    }

    const clips = (data as ClipData[]) ?? [];

    // URL 정규화 후 그룹화
    const groupMap = new Map<string, ClipData[]>();

    for (const clip of clips) {
      if (!clip.url) continue;
      const normalized = normalizeUrl(clip.url);
      const existing = groupMap.get(normalized);
      if (existing) {
        existing.push(clip);
      } else {
        groupMap.set(normalized, [clip]);
      }
    }

    // 2개 이상인 그룹만 필터링 (중복)
    const groups: DuplicateGroup[] = [];
    let totalDuplicates = 0;

    for (const [normalizedUrl, groupClips] of groupMap.entries()) {
      if (groupClips.length >= 2) {
        groups.push({ normalizedUrl, clips: groupClips });
        // 각 그룹에서 중복 수 = 전체 - 1 (유지할 1개 제외)
        totalDuplicates += groupClips.length - 1;
      }
    }

    // 중복 수 기준 내림차순 정렬
    groups.sort((a, b) => b.clips.length - a.clips.length);

    const response: DuplicatesResponse = { groups, totalDuplicates };
    return sendSuccess(response);
  } catch (err) {
    console.error('[API v1 Duplicates] Error:', err);
    return errors.internalError();
  }
}

const routeHandler = withAuth(
  async (req, auth) => {
    if (req.method === 'GET') return handleGetDuplicates(req, auth);
    return errors.methodNotAllowed(['GET']);
  },
  { allowedMethods: ['GET'] }
);

export const GET = routeHandler;
export const OPTIONS = routeHandler;
