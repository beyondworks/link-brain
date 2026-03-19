import { NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;

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
    // NOTE: 크레딧 차감은 /api/v1/ai (handleGenerate)에서 이미 수행됨.
    // 이 라우트는 생성 결과를 저장하는 용도이므로 이중 차감하지 않음.
    const body = await req.json() as Record<string, unknown>;
    const { content_type, tone, length, source_clip_ids, output } = body;

    if (!content_type || !output) {
      return NextResponse.json(
        { error: 'content_type and output are required' },
        { status: 400 }
      );
    }

    const insertRow = {
      user_id: auth.publicUserId,
      content_type: content_type as string,
      tone: (tone as string) ?? 'professional',
      length: (length as string) ?? 'medium',
      source_clip_ids: (source_clip_ids as string[]) ?? [],
      output: output as string,
    };
    const { data, error } = await db
      .from('studio_generations')
      .insert(insertRow)
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
