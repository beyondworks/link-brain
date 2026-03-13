import { NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deductCredits } from '@/lib/services/plan-service';
import { errors, sendError } from '@/lib/api/response';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const MAX_GENERATIONS = 50;

async function handler(req: Request, auth: AuthContext) {
  if (req.method === 'GET') {
    const { data, error } = await db
      .from('studio_generations')
      .select('id, content_type, tone, length, source_clip_ids, output, created_at')
      .eq('user_id', auth.publicUserId)
      .order('created_at', { ascending: false })
      .limit(MAX_GENERATIONS);

    if (error) {
      // 테이블 미생성(42P01) 시 빈 배열 반환 — 마이그레이션 미적용 상태 방어
      if ((error as { code?: string }).code === '42P01') {
        return NextResponse.json({ data: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  }

  if (req.method === 'POST') {
    const creditCheck = await deductCredits(auth.publicUserId, 'AI_STUDIO');
    if (!creditCheck.allowed) {
      if (creditCheck.reason === 'STUDIO_LIMIT_REACHED') {
        return sendError(
          'STUDIO_LIMIT_REACHED',
          '이번 달 스튜디오 생성 횟수를 초과했습니다.',
          402,
          { used: creditCheck.used, limit: creditCheck.limit }
        );
      }
      return errors.insufficientCredits(1, (creditCheck.limit ?? 0) - (creditCheck.used ?? 0));
    }

    const body = await req.json() as Record<string, unknown>;
    const { content_type, tone, length, source_clip_ids, output } = body;

    if (!content_type || !output) {
      return NextResponse.json(
        { error: 'content_type and output are required' },
        { status: 400 }
      );
    }

    const { data, error } = await db
      .from('studio_generations')
      .insert({
        user_id: auth.publicUserId,
        content_type,
        tone: tone ?? 'professional',
        length: length ?? 'medium',
        source_clip_ids: source_clip_ids ?? [],
        output,
      })
      .select('id, content_type, tone, length, source_clip_ids, output, created_at')
      .single();

    if (error) {
      // 테이블 미생성(42P01) 또는 RPC 미적용 시 명시적 에러 반환
      if ((error as { code?: string }).code === '42P01') {
        return NextResponse.json(
          { error: { code: 'TABLE_NOT_FOUND', message: 'studio_generations 테이블이 존재하지 않습니다. DB 마이그레이션을 적용해 주세요.' } },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  }

  if (req.method === 'DELETE') {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await db
      .from('studio_generations')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.publicUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

const routeHandler = withAuth(handler);
export { routeHandler as GET, routeHandler as POST, routeHandler as DELETE };
