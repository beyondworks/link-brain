import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { type AuthContext } from '@/lib/api/middleware';
import { errors, sendError, ErrorCodes } from '@/lib/api/response';
import { deductCredits } from '@/lib/services/plan-service';
import { resolveAIConfig } from '@/lib/ai/model-resolver';
import { streamOpenAI } from '../helpers/openai-stream';
import { type ContentStudioType, type AiRequestBody, type ClipRow } from '../types';
import { loadGuide } from '@/lib/ai/guides';

const db = supabaseAdmin;

// ─── 콘텐츠 타입 메타 ─────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ContentStudioType, string> = {
  blog_post: '블로그 포스트',
  sns_post: 'SNS 포스트',
  newsletter: '뉴스레터',
  email_draft: '이메일 초안',
  executive_summary: '요약 보고서',
  key_concepts: '핵심 포인트',
  review_notes: '학습 노트',
  teach_back: '비교 분석',
  quiz: 'Q&A',
  mind_map: '마인드맵',
  simplified_summary: '인포그래픽 텍스트',
};

const TYPE_INSTRUCTIONS: Record<ContentStudioType, string> = {
  blog_post: '서론-본론-결론 구조, 소제목 포함',
  sns_post: '280자 이내, 해시태그 3-5개 포함',
  newsletter: '인삿말-핵심내용-CTA 구조',
  email_draft: '비즈니스 형식, 명확한 요청사항',
  executive_summary: '불렛포인트 중심, 핵심 수치 강조',
  key_concepts: '5-7개 핵심 개념, 각각 1-2줄 설명',
  review_notes: 'Q&A 형식 또는 불렛 정리',
  teach_back: '항목별 비교표 포함',
  quiz: '질문 5-10개, 답변 포함',
  mind_map: '중심 주제 → 하위 주제 → 세부사항 트리 구조',
  simplified_summary: '짧은 문장, 시각화 적합한 키워드 중심',
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
  'blog_post', 'sns_post', 'newsletter', 'email_draft', 'executive_summary',
  'key_concepts', 'review_notes', 'teach_back', 'quiz', 'mind_map', 'simplified_summary',
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

  const systemPrompt =
    `당신은 ${typeLabel} 전문 작가입니다.\n` +
    `다음 소스 자료를 바탕으로 ${toneLabel} 톤으로 ${lengthGuide}의 ${typeLabel}을(를) 작성하세요.\n\n` +
    `요구사항:\n` +
    `- 한국어로 작성\n` +
    `- ${typeInstructions}\n` +
    `- 소스 자료의 핵심 내용을 충실히 반영할 것\n` +
    '- 마크다운 문법(#, **, - 등)을 사용하지 말 것. 순수 플레인 텍스트로만 작성할 것' +
    guideSection;

  const userPrompt = `[소스 자료]\n\n${sourceMaterial}`;

  // 스트리밍 ReadableStream 생성
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of streamOpenAI(systemPrompt, userPrompt, aiConfig.apiKey, aiConfig.model)) {
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
