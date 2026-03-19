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

const db = supabaseAdmin;

// ─── 콘텐츠 타입 메타 ─────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ContentStudioType, string> = {
  blog_post: '블로그 포스트',
  threads_post: 'Threads 포스트',
  instagram_feed: '인스타그램 피드',
  newsletter: '뉴스레터',
  executive_summary: '요약 보고서',
  key_concepts: '핵심 포인트',
  presentation_text: '발표용 텍스트',
  youtube_script: '유튜브 대본',
};

const TYPE_INSTRUCTIONS: Record<ContentStudioType, string> = {
  blog_post: '서론-본론-결론 구조, 소제목 포함. SEO 키워드 자연 배치',
  threads_post: '500자 이내 1개 포스트. 첫 줄 훅 필수. 줄바꿈으로 호흡 조절. 해시태그 3-5개',
  instagram_feed: '캐러셀 슬라이드 구성 (1장=커버 훅, 2-8장=핵심 내용, 마지막=CTA). 슬라이드당 40자 이내',
  newsletter: '인삿말-핵심내용-CTA 구조. 스캔 가능한 불렛 포인트 활용',
  executive_summary: '불렛포인트 중심, 핵심 수치와 결론 선행. 의사결정에 필요한 정보만',
  key_concepts: '5-7개 핵심 개념, 각각 1-2줄 설명. 개념 간 관계 명시',
  presentation_text: '슬라이드별 제목+핵심 메시지+보조 설명. 슬라이드당 50자 이내. 발표자 노트 포함',
  youtube_script: '인트로(15초 훅)-본론(챕터별)-아웃트로(CTA) 구조. 구어체. 타임스탬프 표기',
};

const TONE_LABELS: Record<string, string> = {
  professional: '전문적인',
  casual: '친근한',
  academic: '학술적인',
  creative: '창의적인',
  concise: '간결한',
};

const LENGTH_GUIDES: Record<string, string> = {
  short: '200자 내외',
  medium: '500자 내외',
  long: '1000자 이상',
};

// ─── 유효성 검사 ──────────────────────────────────────────────────────────────

const VALID_TYPES = new Set<ContentStudioType>([
  'blog_post', 'threads_post', 'instagram_feed', 'newsletter',
  'executive_summary', 'key_concepts', 'presentation_text', 'youtube_script',
]);

const VALID_TONES = new Set(['professional', 'casual', 'academic', 'creative', 'concise']);
const VALID_LENGTHS = new Set(['short', 'medium', 'long']);

function isValidType(v: unknown): v is ContentStudioType {
  return typeof v === 'string' && VALID_TYPES.has(v as ContentStudioType);
}

function parseBody(raw: unknown): AiRequestBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.clipIds) || obj.clipIds.length === 0) return null;
  if (!isValidType(obj.type)) return null;
  if (typeof obj.tone !== 'string' || !VALID_TONES.has(obj.tone)) return null;
  if (typeof obj.length !== 'string' || !VALID_LENGTHS.has(obj.length)) return null;

  return {
    clipIds: obj.clipIds.filter((id): id is string => typeof id === 'string').slice(0, 20),
    type: obj.type,
    tone: obj.tone,
    length: obj.length,
  };
}

// ─── 핸들러 ───────────────────────────────────────────────────────────────────

export async function handleGenerate(rawBody: unknown, auth: AuthContext): Promise<NextResponse> {
  const aiConfig = await resolveAIConfig(auth.publicUserId, 'default');
  if (!aiConfig.isUserKey) {
    const creditCheck = await deductCredits(auth.publicUserId, 'AI_STUDIO');
    if (!creditCheck.allowed) {
      return errors.insufficientCredits(1, Math.max(0, (creditCheck.limit ?? 0) - (creditCheck.used ?? 0)));
    }
  }

  const body = parseBody(rawBody);
  if (!body) {
    return sendError(
      ErrorCodes.INVALID_REQUEST,
      'clipIds(비어있지 않은 배열), type, tone, length가 필요합니다.',
      400
    );
  }

  const { clipIds, type, tone, length } = body;

  // 클립 + 콘텐츠 조회 (본인 소유만)
  const { data: clips, error: dbError } = await db
    .from('clips')
    .select('id, title, summary, url, clip_contents(content_markdown, raw_markdown)')
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

  // 소스 자료 텍스트 구성
  const sourceMaterial = clipRows
    .map((clip, idx) => {
      const title = clip.title ?? clip.url;
      const summary = clip.summary ?? '';
      const content =
        clip.clip_contents?.content_markdown ??
        clip.clip_contents?.raw_markdown ??
        '';
      const bodyText = content
        ? `\n내용:\n${content.substring(0, 2000)}`
        : summary
        ? `\n요약: ${summary}`
        : '';
      return `[소스 ${idx + 1}] ${title}${bodyText}`;
    })
    .join('\n\n---\n\n');

  const typeLabel = TYPE_LABELS[type];
  const toneLabel = TONE_LABELS[tone] ?? tone;
  const lengthGuide = LENGTH_GUIDES[length] ?? '500자 내외';
  const typeInstructions = TYPE_INSTRUCTIONS[type];

  const guide = loadGuide(type);
  const guideSection = guide
    ? `\n\n[콘텐츠 유형별 전문 가이드 — 상위 콘텐츠 패턴 분석 기반]\n${guide}\n`
    : '';

  // Collective learning: load aggregated patterns + similar clips
  const typeToCategory: Record<string, string> = {
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

  const systemPrompt =
    `당신은 ${typeLabel} 전문 작가입니다.\n` +
    `다음 소스 자료를 바탕으로 ${toneLabel} 톤으로 ${lengthGuide}의 ${typeLabel}을(를) 작성하세요.\n\n` +
    `요구사항:\n` +
    `- 한국어로 작성\n` +
    `- ${typeInstructions}\n` +
    `- 소스 자료의 핵심 내용을 충실히 반영할 것\n` +
    '- 마크다운 문법(#, **, - 등)을 사용하지 말 것. 순수 플레인 텍스트로만 작성할 것' +
    guideSection +
    collectiveSection;

  const userPrompt = `[소스 자료]\n\n${sourceMaterial}`;

  // 스트리밍 ReadableStream 생성
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of streamAI(aiConfig, systemPrompt, userPrompt)) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        console.error('[API v1 AI] Stream error:', message);
        // 에러 신호를 클라이언트에 전달 후 종료
        try {
          controller.enqueue(encoder.encode(`\n\n[오류: ${message}]`));
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
