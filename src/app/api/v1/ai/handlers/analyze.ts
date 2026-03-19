import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { type AuthContext } from '@/lib/api/middleware';
import { errors, sendError, sendSuccess, ErrorCodes } from '@/lib/api/response';
import { deductCredits } from '@/lib/services/plan-service';
import { resolveAIConfig } from '@/lib/ai/model-resolver';
import { callOpenAI } from '../helpers/openai-stream';
import { type ClipRow } from '../types';

const db = supabaseAdmin;

// ─── Analyze 핸들러 ──────────────────────────────────────────────────────────

export async function handleAnalyze(rawBody: unknown, auth: AuthContext): Promise<NextResponse> {
  const aiConfig = await resolveAIConfig(auth.publicUserId, 'default');
  if (!aiConfig.isUserKey) {
    const creditCheck = await deductCredits(auth.publicUserId, 'AI_SUMMARY');
    if (!creditCheck.allowed) {
      return errors.insufficientCredits(1, Math.max(0, (creditCheck.limit ?? 0) - (creditCheck.used ?? 0)));
    }
  }

  const obj = rawBody as Record<string, unknown>;
  const url = typeof obj.url === 'string' ? obj.url : null;
  const clipIds = Array.isArray(obj.clipIds) ? (obj.clipIds as string[]).slice(0, 20) : [];

  // Fetch clips if clipIds provided
  let sourceMaterial = '';
  if (clipIds.length > 0) {
    const { data: clips, error: dbErr } = await db
      .from('clips')
      .select('id, title, summary, url, clip_contents(content_markdown, raw_markdown)')
      .eq('user_id', auth.publicUserId)
      .in('id', clipIds);

    if (dbErr) {
      console.error('[API v1 AI Analyze] DB error:', dbErr);
      return errors.internalError();
    }

    const clipRows = (clips as ClipRow[]) ?? [];
    sourceMaterial = clipRows.map((clip, idx) => {
      const content = clip.clip_contents?.content_markdown ?? clip.clip_contents?.raw_markdown ?? '';
      const body = content ? `\n내용:\n${content.substring(0, 2000)}` : clip.summary ? `\n요약: ${clip.summary}` : '';
      return `[소스 ${idx + 1}] ${clip.title ?? clip.url}${body}`;
    }).join('\n\n---\n\n');
  } else if (url) {
    sourceMaterial = `URL: ${url}`;
  } else {
    return sendError(ErrorCodes.INVALID_REQUEST, 'url 또는 clipIds가 필요합니다.', 400);
  }

  try {
    const systemPrompt =
      '당신은 콘텐츠 분석 전문가입니다. 주어진 소스 자료를 분석하여 다음 JSON 형식으로 응답하세요:\n' +
      '{\n' +
      '  "title": "분석 제목",\n' +
      '  "summary": "핵심 요약 (2-3문장)",\n' +
      '  "keywords": ["키워드1", "키워드2", ...],\n' +
      '  "category": "주제 카테고리",\n' +
      '  "sentiment": "positive|neutral|negative",\n' +
      '  "keyPoints": ["핵심 포인트1", "핵심 포인트2", ...],\n' +
      '  "readingTime": "예상 읽기 시간 (분)"\n' +
      '}\n' +
      '반드시 유효한 JSON만 응답하세요.';

    const content = await callOpenAI(systemPrompt, `[소스 자료]\n\n${sourceMaterial}`, aiConfig.apiKey, aiConfig.model);

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    return sendSuccess({ action: 'analyze', result: parsed });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 402) return sendError(ErrorCodes.INSUFFICIENT_CREDITS, 'OpenAI 크레딧 부족', 402, undefined);
    console.error('[API v1 AI Analyze] Error:', err);
    return errors.internalError();
  }
}
