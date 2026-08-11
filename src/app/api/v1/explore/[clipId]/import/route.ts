/**
 * API v1 - Explore Import
 *
 * POST /api/v1/explore/[clipId]/import
 *
 * 탐색(Explore)에서 발견한 공개 클립을 내 클립으로 복사한다.
 * 원본 클립의 소유자 정보는 복사하지도, 응답에 담지도 않는다 (익명 원칙).
 * 이미 분석이 끝난 콘텐츠를 그대로 가져오므로 재처리 없이 'ready'로 저장한다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, sendError, ErrorCodes, errors } from '@/lib/api/response';
import { checkClipLimit } from '@/lib/services/plan-service';

type RouteContext = { params: Promise<{ clipId: string }> };

const db = supabaseAdmin;

interface SourceClip {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  image: string | null;
  platform: string;
}

interface SourceContent {
  html_content: string | null;
  content_markdown: string | null;
  raw_markdown: string | null;
}

async function handleImport(
  auth: AuthContext,
  clipId: string
): Promise<NextResponse> {
  try {
    // 1. 원본은 반드시 공개 클립이어야 한다
    const { data: sourceRow, error: sourceError } = await db
      .from('clips')
      .select('id, url, title, summary, image, platform')
      .eq('id', clipId)
      .eq('is_public', true)
      .single();

    if (sourceError || !sourceRow) return errors.notFound('clip');
    const source = sourceRow as SourceClip;

    // 2. 플랜 한도
    const clipLimit = await checkClipLimit(auth.publicUserId);
    if (!clipLimit.allowed) {
      return errors.planLimitReached('clip', clipLimit.used ?? 0, clipLimit.limit ?? 0);
    }

    // 3. 중복 URL 체크 (내 클립 기준)
    const { data: existing } = await db
      .from('clips')
      .select('id')
      .eq('user_id', auth.publicUserId)
      .eq('url', source.url)
      .maybeSingle();

    if (existing) {
      return sendError(ErrorCodes.DUPLICATE_URL, 'This URL has already been saved.', 409, {
        existingClipId: (existing as { id: string }).id,
      });
    }

    // 4. 내 클립으로 복사 — 분석 결과를 그대로 가져오므로 즉시 ready
    const { data: clipRow, error: insertError } = await db
      .from('clips')
      .insert({
        user_id: auth.publicUserId,
        url: source.url,
        title: source.title,
        summary: source.summary,
        image: source.image,
        platform: source.platform,
        is_favorite: false,
        is_read_later: false,
        is_archived: false,
        is_public: false,
        views: 0,
        likes_count: 0,
        processing_status: 'ready',
      })
      .select('id, url, title, summary, image, platform, created_at')
      .single();

    if (insertError || !clipRow) {
      console.error('[API v1 Explore Import] Insert error:', insertError);
      return errors.internalError();
    }

    const newClip = clipRow as SourceClip & { created_at: string };

    // 5. 본문이 있으면 함께 복사 (없어도 임포트는 성공)
    const { data: contentRow } = await db
      .from('clip_contents')
      .select('html_content, content_markdown, raw_markdown')
      .eq('clip_id', clipId)
      .maybeSingle();

    if (contentRow) {
      const content = contentRow as SourceContent;
      const { error: contentError } = await db.from('clip_contents').insert({
        clip_id: newClip.id,
        html_content: content.html_content,
        content_markdown: content.content_markdown,
        raw_markdown: content.raw_markdown,
      });
      if (contentError) {
        console.error('[API v1 Explore Import] Content copy failed:', contentError);
      }
    }

    return sendSuccess(
      {
        id: newClip.id,
        url: newClip.url,
        title: newClip.title,
        summary: newClip.summary,
        image: newClip.image,
        platform: newClip.platform,
        processingStatus: 'ready',
        createdAt: newClip.created_at,
      },
      201
    );
  } catch (err) {
    console.error('[API v1 Explore Import] Error:', err);
    return errors.internalError();
  }
}

const routeHandler = withAuth(
  async (req, auth, params) => {
    const clipId = params?.clipId ?? '';
    if (!clipId) return errors.invalidRequest('Clip ID is required');
    if (req.method === 'POST') return handleImport(auth, clipId);
    return errors.methodNotAllowed(['POST']);
  },
  { allowedMethods: ['POST'] }
);

export async function POST(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}

export async function OPTIONS(req: NextRequest, context: RouteContext) {
  return routeHandler(req, context);
}
