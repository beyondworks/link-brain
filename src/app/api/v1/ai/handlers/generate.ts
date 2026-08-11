import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { type AuthContext } from '@/lib/api/middleware';
import { errors, sendError, ErrorCodes } from '@/lib/api/response';
import { deductCredits } from '@/lib/services/plan-service';
import { resolveAIConfig } from '@/lib/ai/model-resolver';
import { streamAI } from '../helpers/openai-stream';
import { type ContentStudioType, type AiRequestBody, type ClipRow } from '../types';
import { loadGuide } from '@/lib/ai/guides';
import { loadCollectivePatterns } from '@/lib/ai/guides/collective';
import { STUDIO_FORMATS, isStudioLength } from '@/lib/ai/studio-formats';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/ai/studio-prompt';
import { buildSourceMaterial, buildSourcesSection, type SourceClip } from '@/lib/ai/studio-source';
import { encodeStreamError } from '@/lib/ai/stream-error';

const db = supabaseAdmin;

// ─── 콘텐츠 타입 메타 ─────────────────────────────────────────────────────────
// 타입별 지시문 / 길이 목표는 STUDIO_FORMATS 한 곳에서만 정의된다.

// 창작 생성용 온도 — 결정적 요약이 아니라 읽히는 글이 목표
const GENERATION_TEMPERATURE = 0.7;
// 3,500자 한국어 본문 + 출처까지 잘리지 않게
const GENERATION_MAX_TOKENS = 8000;

// ─── 유효성 검사 ──────────────────────────────────────────────────────────────

const VALID_TYPES = new Set<ContentStudioType>(
  Object.keys(STUDIO_FORMATS) as ContentStudioType[]
);
const VALID_TONES = new Set(['professional', 'casual', 'academic', 'creative', 'concise']);

function isValidType(v: unknown): v is ContentStudioType {
  return typeof v === 'string' && VALID_TYPES.has(v as ContentStudioType);
}

function parseBody(raw: unknown): AiRequestBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.clipIds) || obj.clipIds.length === 0) return null;
  if (!isValidType(obj.type)) return null;
  if (typeof obj.tone !== 'string' || !VALID_TONES.has(obj.tone)) return null;
  if (!isStudioLength(obj.length)) return null;

  return {
    clipIds: obj.clipIds.filter((id): id is string => typeof id === 'string').slice(0, 20),
    type: obj.type,
    tone: obj.tone,
    length: obj.length,
    // 기본 on — 명시적으로 false일 때만 끈다
    includeSources: obj.includeSources !== false,
  };
}

// ─── 핸들러 ───────────────────────────────────────────────────────────────────

export async function handleGenerate(rawBody: unknown, auth: AuthContext): Promise<NextResponse> {
  // 1) 입력 검증이 먼저 — 잘못된 요청으로 크레딧이 소모되면 안 된다
  const body = parseBody(rawBody);
  if (!body) {
    return sendError(
      ErrorCodes.INVALID_REQUEST,
      'clipIds(비어있지 않은 배열), type, tone, length가 필요합니다.',
      400
    );
  }

  const { clipIds, type, tone, length, includeSources } = body;

  // 2) 클립 + 콘텐츠 조회 (본인 소유만)
  const { data: clips, error: dbError } = await db
    .from('clips')
    .select('id, title, summary, url, platform, created_at, clip_contents(content_markdown, raw_markdown)')
    .eq('user_id', auth.publicUserId)
    .in('id', clipIds);

  if (dbError) {
    console.error('[API v1 AI] DB error:', dbError);
    return errors.internalError();
  }

  const clipRows = (clips as ClipRow[]) ?? [];
  if (clipRows.length === 0) {
    return sendError(ErrorCodes.INVALID_REQUEST, '유효한 클립을 찾을 수 없습니다.', 400);
  }

  // 3) 검증을 모두 통과한 뒤에야 크레딧 차감
  const aiConfig = await resolveAIConfig(auth.publicUserId, 'default');
  if (!aiConfig.isUserKey) {
    const creditCheck = await deductCredits(auth.publicUserId, 'AI_STUDIO');
    if (!creditCheck.allowed) {
      return errors.insufficientCredits(1, Math.max(0, (creditCheck.limit ?? 0) - (creditCheck.used ?? 0)));
    }
  }

  const sourceClips: SourceClip[] = clipRows.map((clip) => ({
    title: clip.title,
    url: clip.url,
    platform: clip.platform ?? null,
    summary: clip.summary,
    createdAt: clip.created_at ?? null,
    content: clip.clip_contents?.content_markdown ?? clip.clip_contents?.raw_markdown ?? null,
  }));

  const sourceMaterial = buildSourceMaterial(sourceClips);

  const guide = loadGuide(type);
  const guideSection = guide
    ? `\n[콘텐츠 유형별 전문 가이드 — 분량 지시가 위와 다르면 위를 따른다]\n${guide}\n`
    : '';

  // Collective learning: load aggregated patterns + similar clips
  const typeToCategory: Record<ContentStudioType, string> = {
    blog_post: 'blog', threads_post: 'sns', instagram_feed: 'sns',
    newsletter: 'newsletter', executive_summary: 'web', key_concepts: 'web',
    presentation_text: 'web', youtube_script: 'youtube',
  };
  let collectiveSection = '';
  try {
    collectiveSection = await loadCollectivePatterns(
      typeToCategory[type] ?? 'web',
      clipIds,
      auth.publicUserId
    );
  } catch {
    /* collective patterns unavailable — continue without */
  }

  const systemPrompt = buildSystemPrompt({ type, tone, length, guideSection, collectiveSection });
  const userPrompt = buildUserPrompt(sourceMaterial);
  const sourcesSection = includeSources ? buildSourcesSection(sourceClips) : '';

  // 스트리밍 ReadableStream 생성
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of streamAI(aiConfig, systemPrompt, userPrompt, {
          temperature: GENERATION_TEMPERATURE,
          maxTokens: GENERATION_MAX_TOKENS,
        })) {
          controller.enqueue(encoder.encode(chunk));
        }
        if (sourcesSection) {
          controller.enqueue(encoder.encode(sourcesSection));
        }
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        console.error('[API v1 AI] Stream error:', message);
        // 에러 마커를 전달 — 클라이언트는 이 응답을 저장하지 않고 토스트로 알린다
        try {
          controller.enqueue(encoder.encode(encodeStreamError(message)));
        } catch { /* enqueue 실패 시 무시 */ }
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
