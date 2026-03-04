/**
 * API v1 - Related Clips
 *
 * GET /api/v1/clips/[clipId]/related
 * 추천 우선순위: 공통 태그 수 > 같은 카테고리 > 같은 도메인
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import type { ClipData } from '@/types/database';

type RouteContext = { params: Promise<{ clipId: string }> };

// Escape strict Supabase generics for tables not fully typed
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
  commonTags: string[];
}

type ClipRow = Pick<ClipData, 'id' | 'title' | 'url' | 'image' | 'platform' | 'summary' | 'category_id'>;

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

async function handleGet(
  _req: NextRequest,
  auth: AuthContext,
  clipId: string
): Promise<NextResponse> {
  // 원본 클립 존재 및 소유 확인
  const { data: sourceRaw, error: sourceErr } = await db
    .from('clips')
    .select('id, user_id, url, category_id')
    .eq('id', clipId)
    .single();

  if (sourceErr || !sourceRaw) return errors.notFound('clip');

  const sourceClip = sourceRaw as Pick<ClipData, 'id' | 'user_id' | 'url' | 'category_id'>;
  if (sourceClip.user_id !== auth.publicUserId) return errors.accessDenied();

  const sourceDomain = extractDomain(sourceClip.url);

  // 1단계: 현재 클립의 태그 조회
  const { data: sourceTagRows } = await db
    .from('clip_tags')
    .select('tag_id, tags(name)')
    .eq('clip_id', clipId);

  const sourceTagIds: string[] = ((sourceTagRows ?? []) as Array<{ tag_id: string }>).map(
    (r) => r.tag_id
  );
  const sourceTagNames: string[] = ((sourceTagRows ?? []) as Array<{ tags: { name: string } | null }>)
    .map((r) => r.tags?.name ?? '')
    .filter(Boolean);

  const seen = new Set<string>();
  const results: RelatedClip[] = [];

  // 2단계: 같은 태그를 가진 클립 검색 (공통 태그 수 기준 정렬)
  if (sourceTagIds.length > 0) {
    const { data: tagMatchRows } = await db
      .from('clip_tags')
      .select('clip_id, tag_id, tags(name)')
      .in('tag_id', sourceTagIds)
      .neq('clip_id', clipId);

    type TagMatchRow = { clip_id: string; tag_id: string; tags: { name: string } | null };
    const tagMatchData = (tagMatchRows ?? []) as TagMatchRow[];

    // clip_id별 공통 태그 집계
    const clipTagMap = new Map<string, { tagIds: Set<string>; tagNames: Set<string> }>();
    for (const row of tagMatchData) {
      if (!clipTagMap.has(row.clip_id)) {
        clipTagMap.set(row.clip_id, { tagIds: new Set(), tagNames: new Set() });
      }
      const entry = clipTagMap.get(row.clip_id)!;
      entry.tagIds.add(row.tag_id);
      if (row.tags?.name) entry.tagNames.add(row.tags.name);
    }

    // 공통 태그 수 내림차순 정렬
    const sortedClipIds = [...clipTagMap.entries()]
      .sort((a, b) => b[1].tagIds.size - a[1].tagIds.size)
      .map(([id]) => id);

    if (sortedClipIds.length > 0) {
      const { data: tagClipsRaw } = await db
        .from('clips')
        .select('id, title, url, image, platform, summary, category_id')
        .eq('user_id', auth.publicUserId)
        .eq('is_archived', false)
        .in('id', sortedClipIds);

      // sortedClipIds 순서 유지
      const tagClipMap = new Map<string, ClipRow>();
      for (const row of ((tagClipsRaw ?? []) as ClipRow[])) {
        tagClipMap.set(row.id, row);
      }

      for (const cid of sortedClipIds) {
        if (results.length >= 5) break;
        const clip = tagClipMap.get(cid);
        if (!clip) continue;
        seen.add(cid);
        const common = clipTagMap.get(cid)!;
        results.push({
          id: clip.id,
          title: clip.title,
          url: clip.url,
          image: clip.image,
          platform: clip.platform,
          summary: clip.summary,
          similarity: common.tagIds.size / sourceTagIds.length,
          commonTags: [...common.tagNames],
        });
      }
    }
  }

  // 3단계: 같은 카테고리 폴백
  if (results.length < 5 && sourceClip.category_id) {
    const remaining = 5 - results.length;
    const excludeIds = [clipId, ...seen];

    const { data: catClipsRaw } = await db
      .from('clips')
      .select('id, title, url, image, platform, summary, category_id')
      .eq('user_id', auth.publicUserId)
      .eq('category_id', sourceClip.category_id)
      .eq('is_archived', false)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(remaining);

    for (const clip of ((catClipsRaw ?? []) as ClipRow[])) {
      if (seen.has(clip.id)) continue;
      seen.add(clip.id);

      // 공통 태그 계산 (이미 태그 조회 완료된 경우 활용)
      const commonTags = sourceTagNames.length > 0 ? await getCommonTagNames(clip.id, sourceTagIds) : [];

      results.push({
        id: clip.id,
        title: clip.title,
        url: clip.url,
        image: clip.image,
        platform: clip.platform,
        summary: clip.summary,
        similarity: 0,
        commonTags,
      });
    }
  }

  // 4단계: 같은 도메인 폴백
  if (results.length < 5 && sourceDomain) {
    const remaining = 5 - results.length;
    const excludeIds = [clipId, ...seen];

    const { data: domainClipsRaw } = await db
      .from('clips')
      .select('id, title, url, image, platform, summary, category_id')
      .eq('user_id', auth.publicUserId)
      .eq('is_archived', false)
      .ilike('url', `%${sourceDomain}%`)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(remaining);

    for (const clip of ((domainClipsRaw ?? []) as ClipRow[])) {
      if (seen.has(clip.id)) continue;
      // 도메인 정확히 일치하는지 재확인
      if (extractDomain(clip.url) !== sourceDomain) continue;
      seen.add(clip.id);
      results.push({
        id: clip.id,
        title: clip.title,
        url: clip.url,
        image: clip.image,
        platform: clip.platform,
        summary: clip.summary,
        similarity: 0,
        commonTags: [],
      });
    }
  }

  return sendSuccess(results);
}

async function getCommonTagNames(clipId: string, sourceTagIds: string[]): Promise<string[]> {
  if (sourceTagIds.length === 0) return [];
  const { data } = await db
    .from('clip_tags')
    .select('tag_id, tags(name)')
    .eq('clip_id', clipId)
    .in('tag_id', sourceTagIds);

  type Row = { tag_id: string; tags: { name: string } | null };
  return ((data ?? []) as Row[]).map((r) => r.tags?.name ?? '').filter(Boolean);
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
