/**
 * POST /api/v1/ai - AI 액션 라우터
 *
 * action=generate (default) — 스트리밍 콘텐츠 생성
 *   Body: { action?: 'generate', clipIds, type, tone, length }
 * action=analyze — 클립 세트 구조 분석 (JSON 응답)
 *   Body: { action: 'analyze', url?, clipIds? }
 * action=ask — 클립 컨텍스트 기반 Q&A (JSON 응답)
 *   Body: { action: 'ask', message, clipIds?, language? }
 * action=insights — 읽기 패턴 인사이트 리포트 (JSON 응답)
 *   Body: { action: 'insights', period?, days?, language? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { errors, sendError, sendSuccess, ErrorCodes } from '@/lib/api/response';
import { deductCredits } from '@/lib/services/plan-service';
import { CHAT_TOOL_DEFINITIONS, executeTool } from '@/lib/ai/chat-tools';
import { resolveAIConfig } from '@/lib/ai/model-resolver';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Database Insert 타입 비호환 우회
const db = supabaseAdmin as any;

// ─── 타입 ────────────────────────────────────────────────────────────────────

type ContentStudioType =
  | 'blog_post'
  | 'sns_post'
  | 'newsletter'
  | 'email_draft'
  | 'executive_summary'
  | 'key_concepts'
  | 'review_notes'
  | 'teach_back'
  | 'quiz'
  | 'mind_map'
  | 'simplified_summary';

interface AiRequestBody {
  clipIds: string[];
  type: ContentStudioType;
  tone: string;
  length: string;
}

interface ClipRow {
  id: string;
  title: string | null;
  summary: string | null;
  url: string;
  clip_contents: { content_markdown: string | null; raw_markdown: string | null } | null;
}

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

// ─── OpenAI fetch 헬퍼 ───────────────────────────────────────────────────────

interface OpenAIStreamChunk {
  choices: Array<{
    delta: { content?: string };
    finish_reason: string | null;
  }>;
}

async function* streamOpenAI(systemPrompt: string, userPrompt: string, apiKey?: string, model?: string): AsyncGenerator<string> {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model ?? 'gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) {
      throw Object.assign(new Error('OpenAI 크레딧 부족 또는 요청 한도 초과'), { status: 402 });
    }
    throw new Error(`OpenAI API 오류 (${res.status}): ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('응답 스트림을 읽을 수 없습니다.');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6);
        try {
          const chunk = JSON.parse(jsonStr) as OpenAIStreamChunk;
          const content = chunk.choices[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // JSON 파싱 실패 시 스킵
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── OpenAI 비스트리밍 헬퍼 ─────────────────────────────────────────────────

async function callOpenAI(systemPrompt: string, userPrompt: string, apiKey?: string, model?: string): Promise<string> {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model ?? 'gpt-4o-mini',
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw Object.assign(new Error('OpenAI 크레딧 부족 또는 요청 한도 초과'), { status: 402 });
    }
    const errText = await res.text();
    throw new Error(`OpenAI API 오류 (${res.status}): ${errText}`);
  }

  const json = await res.json() as { choices: Array<{ message: { content: string } }> };
  return json.choices[0]?.message?.content ?? '';
}

// ─── Analyze 핸들러 ──────────────────────────────────────────────────────────

async function handleAnalyze(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const aiConfig = await resolveAIConfig(auth.publicUserId, 'default');
  if (!aiConfig.isUserKey) {
    const creditCheck = await deductCredits(auth.publicUserId, 'AI_SUMMARY');
    if (!creditCheck.allowed) {
      return errors.insufficientCredits(1, Math.max(0, (creditCheck.limit ?? 0) - (creditCheck.used ?? 0)));
    }
  }

  let rawBody: unknown;
  try { rawBody = await req.json(); } catch {
    return sendError(ErrorCodes.INVALID_REQUEST, '요청 본문이 올바른 JSON이 아닙니다.', 400);
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

// ─── Ask 핸들러 (Function Calling) ──────────────────────────────────────────

async function handleAsk(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const aiConfig = await resolveAIConfig(auth.publicUserId, 'chat');
  if (!aiConfig.isUserKey) {
    const creditCheck = await deductCredits(auth.publicUserId, 'AI_CHAT');
    if (!creditCheck.allowed) {
      return errors.insufficientCredits(1, Math.max(0, (creditCheck.limit ?? 0) - (creditCheck.used ?? 0)));
    }
  }

  let rawBody: unknown;
  try { rawBody = await req.json(); } catch {
    return sendError(ErrorCodes.INVALID_REQUEST, '요청 본문이 올바른 JSON이 아닙니다.', 400);
  }

  const obj = rawBody as Record<string, unknown>;
  const message = typeof obj.message === 'string' ? obj.message.trim() : '';
  if (!message) return sendError(ErrorCodes.INVALID_REQUEST, '"message" 필드가 필요합니다.', 400);

  const clipIds = Array.isArray(obj.clipIds) ? (obj.clipIds as string[]) : [];
  const conversationId = typeof obj.conversationId === 'string' ? obj.conversationId : null;
  const language = obj.language === 'en' ? 'en' : 'ko';

  // ─── Legacy mode: if clipIds provided, use direct context (no function calling) ──
  if (clipIds.length > 0) {
    return handleAskLegacy(auth, message, clipIds, conversationId, language, aiConfig.apiKey, aiConfig.model);
  }

  // ─── Load conversation history ──────────────────────────────────────
  let conversationHistory: Array<{ role: string; content: string }> = [];
  let activeConversationId = conversationId;

  if (conversationId) {
    const { data: prevMessages } = await db
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (prevMessages) {
      conversationHistory = (prevMessages as Array<{ role: string; content: string }>).slice(-10);
    }
  }

  // ─── Build messages for function calling ────────────────────────────
  const lang = language === 'en' ? 'English' : '한국어';
  const systemPrompt =
    `당신은 Linkbrain 세컨드 브레인 어시스턴트입니다. 사용자의 저장된 콘텐츠(클립)를 도구를 사용하여 검색하고 분석하여 질문에 답변합니다. ${lang}로 답변하세요.\n\n` +
    '도구 사용 규칙:\n' +
    '- 사용자 질문에 답하기 위해 필요한 도구를 자유롭게 호출하세요\n' +
    '- 키워드 검색에는 search_clips, 의미 기반 검색에는 find_similar_clips를 사용하세요\n' +
    '- 특정 클립의 상세 내용이 필요하면 get_clip_content를 사용하세요\n' +
    '- 컬렉션, 카테고리, 태그 현황 질문에는 해당 list_ 도구를 사용하세요\n' +
    '- 도구 결과를 바탕으로 정확하고 구체적으로 답변하세요\n' +
    '- 어떤 클립을 참조했는지 답변에 포함하세요\n' +
    '- 관련 정보가 없으면 솔직히 알려주세요';

  const messages: Array<{ role: string; content?: string; tool_calls?: unknown[]; tool_call_id?: string; name?: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current user message
  messages.push({ role: 'user', content: message });

  try {
    // ─── Function calling loop (max 5 iterations) ──────────────────
    const collectedClipIds: string[] = [];
    let finalResponse = '';
    const MAX_TOOL_ROUNDS = 5;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages,
          tools: CHAT_TOOL_DEFINITIONS,
          tool_choice: 'auto',
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw Object.assign(new Error('OpenAI 크레딧 부족'), { status: 402 });
        }
        const errText = await res.text();
        throw new Error(`OpenAI API 오류 (${res.status}): ${errText}`);
      }

      const json = await res.json() as {
        choices: Array<{
          message: {
            role: string;
            content: string | null;
            tool_calls?: Array<{
              id: string;
              type: string;
              function: { name: string; arguments: string };
            }>;
          };
          finish_reason: string;
        }>;
      };

      const choice = json.choices[0];
      const assistantMsg = choice.message;

      // If no tool calls, we have the final answer
      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        finalResponse = assistantMsg.content ?? '';
        break;
      }

      // Add assistant message with tool calls to history
      messages.push({
        role: assistantMsg.role,
        content: assistantMsg.content ?? undefined,
        tool_calls: assistantMsg.tool_calls,
      });

      // Execute each tool call
      for (const toolCall of assistantMsg.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        } catch {
          args = {};
        }

        const result = await executeTool(toolCall.function.name, args, auth.publicUserId);

        // Collect clip IDs from results
        try {
          const parsed = JSON.parse(result) as { clips?: Array<{ id?: string }> };
          if (parsed.clips) {
            for (const clip of parsed.clips) {
              if (clip.id && !collectedClipIds.includes(clip.id)) {
                collectedClipIds.push(clip.id);
              }
            }
          }
        } catch { /* ignore parse errors */ }

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // If this was the last round, force a text response
      if (round === MAX_TOOL_ROUNDS - 1) {
        messages.push({
          role: 'user',
          content: '도구 호출을 마치고 최종 답변을 작성해 주세요.',
        });
      }
    }

    // ─── Save conversation & stream response ──────────────────────────
    if (!activeConversationId) {
      const { data: newConv } = await db
        .from('conversations')
        .insert({ user_id: auth.publicUserId, title: message.substring(0, 100) })
        .select('id')
        .single();
      if (newConv) activeConversationId = (newConv as { id: string }).id;
    } else {
      await db.from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeConversationId);
    }

    if (activeConversationId) {
      await db.from('messages').insert({
        conversation_id: activeConversationId,
        role: 'user',
        content: message,
      });
      await db.from('messages').insert({
        conversation_id: activeConversationId,
        role: 'assistant',
        content: finalResponse,
        clip_references: collectedClipIds.slice(0, 20),
      });
    }

    // Stream response (send metadata first, then content)
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const meta = JSON.stringify({
          conversationId: activeConversationId,
          clipIds: collectedClipIds.slice(0, 20),
          usedRag: false,
          usedTools: true,
        });
        controller.enqueue(encoder.encode(`data: ${meta}\n\n`));
        controller.enqueue(encoder.encode(finalResponse));
        controller.close();
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        Connection: 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 402) return sendError(ErrorCodes.INSUFFICIENT_CREDITS, 'OpenAI 크레딧 부족', 402, undefined);
    console.error('[API v1 AI Ask] Error:', err);
    return errors.internalError();
  }
}

// ─── Ask Legacy 핸들러 (clipIds 직접 지정) ──────────────────────────────────

async function handleAskLegacy(
  auth: AuthContext,
  message: string,
  clipIds: string[],
  conversationId: string | null,
  language: string,
  apiKey?: string,
  model?: string
): Promise<NextResponse> {
  let context = '';
  const { data: clips, error: dbErr } = await db
    .from('clips')
    .select('id, title, summary, url, clip_contents(content_markdown, raw_markdown)')
    .eq('user_id', auth.publicUserId)
    .in('id', clipIds.slice(0, 20));

  if (!dbErr && clips) {
    context = (clips as ClipRow[]).map((clip, idx) => {
      const content = clip.clip_contents?.content_markdown ?? clip.clip_contents?.raw_markdown ?? '';
      const body = content ? `\n내용:\n${content.substring(0, 1500)}` : clip.summary ? `\n요약: ${clip.summary}` : '';
      return `[클립 ${idx + 1}: ${clip.id}] ${clip.title ?? clip.url}${body}`;
    }).join('\n\n---\n\n');
  }

  let activeConversationId = conversationId;
  const lang = language === 'en' ? 'English' : '한국어';
  let systemPrompt = `당신은 Linkbrain 세컨드 브레인 어시스턴트입니다. 사용자가 저장한 클립을 기반으로 질문에 답변합니다. ${lang}로 답변하세요.\n\n`;
  systemPrompt += '답변 규칙:\n- 클립 내용을 기반으로 답변할 때 어떤 클립을 참조했는지 언급하세요\n- 클립에 관련 정보가 없으면 솔직히 알려주세요\n- 답변은 구조화하되 간결하게 유지하세요\n';
  if (context) systemPrompt += `\n[참조 클립]\n${context}`;

  try {
    if (!activeConversationId) {
      const { data: newConv } = await db
        .from('conversations')
        .insert({ user_id: auth.publicUserId, title: message.substring(0, 100) })
        .select('id')
        .single();
      if (newConv) activeConversationId = (newConv as { id: string }).id;
    }

    if (activeConversationId) {
      await db.from('messages').insert({ conversation_id: activeConversationId, role: 'user', content: message });
    }

    let fullAnswer = '';
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const meta = JSON.stringify({ conversationId: activeConversationId, clipIds, usedRag: false });
          controller.enqueue(encoder.encode(`data: ${meta}\n\n`));
          for await (const chunk of streamOpenAI(systemPrompt, message, apiKey, model)) {
            fullAnswer += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          if (activeConversationId) {
            await db.from('messages').insert({
              conversation_id: activeConversationId,
              role: 'assistant',
              content: fullAnswer,
              clip_references: clipIds,
            });
          }
          controller.close();
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : '알 수 없는 오류';
          try { controller.enqueue(encoder.encode(`\n\n[오류: ${errMsg}]`)); } catch { /* */ }
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        Connection: 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 402) return sendError(ErrorCodes.INSUFFICIENT_CREDITS, 'OpenAI 크레딧 부족', 402, undefined);
    console.error('[API v1 AI Ask Legacy] Error:', err);
    return errors.internalError();
  }
}

// ─── Insights 핸들러 ─────────────────────────────────────────────────────────

async function handleInsights(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const aiConfig = await resolveAIConfig(auth.publicUserId, 'default');
  if (!aiConfig.isUserKey) {
    const creditCheck = await deductCredits(auth.publicUserId, 'AI_INSIGHTS');
    if (!creditCheck.allowed) {
      return errors.insufficientCredits(1, Math.max(0, (creditCheck.limit ?? 0) - (creditCheck.used ?? 0)));
    }
  }

  let rawBody: unknown;
  try { rawBody = await req.json(); } catch {
    return sendError(ErrorCodes.INVALID_REQUEST, '요청 본문이 올바른 JSON이 아닙니다.', 400);
  }

  const obj = rawBody as Record<string, unknown>;
  const period = typeof obj.period === 'string' ? obj.period : 'week';
  const days = typeof obj.days === 'number' ? Math.min(Math.max(obj.days, 1), 365) : null;
  const language = obj.language === 'en' ? 'en' : 'ko';

  // Calculate date range
  const now = new Date();
  let fromDate: Date;
  if (period === 'custom' && days) {
    fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  } else if (period === 'month') {
    fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === 'quarter') {
    fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else {
    fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const { data: clips, error: dbErr } = await db
    .from('clips')
    .select('id, title, summary, platform, category_id, created_at, categories(name)')
    .eq('user_id', auth.publicUserId)
    .gte('created_at', fromDate.toISOString())
    .order('created_at', { ascending: false });

  if (dbErr) {
    console.error('[API v1 AI Insights] DB error:', dbErr);
    return errors.internalError();
  }

  const clipRows = (clips as Array<Record<string, unknown>>) ?? [];
  const totalClips = clipRows.length;

  if (totalClips === 0) {
    return sendSuccess({
      action: 'insights',
      period,
      totalClips: 0,
      summary: language === 'en'
        ? 'No clips saved in this period.'
        : '해당 기간에 저장된 클립이 없습니다.',
      platformBreakdown: {},
      topCategories: [],
      aiAnalysis: null,
    });
  }

  // Compute basic stats
  const platformCount: Record<string, number> = {};
  const categoryCount: Record<string, number> = {};

  for (const clip of clipRows) {
    const platform = typeof clip.platform === 'string' ? clip.platform : 'web';
    platformCount[platform] = (platformCount[platform] ?? 0) + 1;

    const catName = (clip.categories as { name?: string } | null)?.name;
    if (catName) categoryCount[catName] = (categoryCount[catName] ?? 0) + 1;
  }

  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Fetch content summaries for AI analysis
  const clipIdsForContent = clipRows.slice(0, 30).map((c) => c.id as string);
  let contentSummaries = '';
  if (clipIdsForContent.length > 0) {
    const { data: clipContents } = await db
      .from('clips')
      .select('title, summary, clip_contents(content_markdown)')
      .in('id', clipIdsForContent);

    if (clipContents) {
      contentSummaries = (clipContents as Array<{ title: string | null; summary: string | null; clip_contents: { content_markdown: string | null } | null }>)
        .map((c, i) => {
          const content = c.clip_contents?.content_markdown?.substring(0, 300) ?? c.summary ?? '';
          return `${i + 1}. ${c.title ?? '제목 없음'}: ${content}`;
        })
        .join('\n');
    }
  }

  // Check reading debt (saved but never read)
  const { count: unreadCount } = await db
    .from('clips')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.publicUserId)
    .eq('is_read', false)
    .eq('is_archived', false);

  // Build summary text for AI
  const statsSummary =
    `기간: ${period === 'custom' ? `${days}일` : period}\n` +
    `총 클립: ${totalClips}개\n` +
    `플랫폼 분포: ${Object.entries(platformCount).map(([k, v]) => `${k}(${v})`).join(', ')}\n` +
    `상위 카테고리: ${topCategories.map((c) => `${c.name}(${c.count})`).join(', ')}\n` +
    `미읽은 클립: ${unreadCount ?? 0}개\n\n` +
    `클립 콘텐츠 요약:\n${contentSummaries}`;

  try {
    const lang = language === 'en' ? 'English' : '한국어';
    const systemPrompt =
      `당신은 지식 관리 및 학습 패턴 분석 전문가입니다. 사용자의 저장된 콘텐츠를 깊이 분석하여 인사이트를 제공하세요. ${lang}로 답변하세요.\n\n` +
      `다음 JSON 형식으로 응답하세요:\n` +
      `{\n` +
      `  "summary": "전체 요약 (2-3문장)",\n` +
      `  "trends": ["트렌드1", "트렌드2", "트렌드3"],\n` +
      `  "recommendations": ["추천사항1", "추천사항2"],\n` +
      `  "topicFocus": "주된 관심 주제",\n` +
      `  "knowledgeClusters": [{"name": "클러스터명", "clipCount": 3, "description": "설명"}],\n` +
      `  "readingDebt": {"count": ${unreadCount ?? 0}, "suggestion": "읽기 부채 해소 제안"},\n` +
      `  "actionItems": ["행동 제안1", "행동 제안2"]\n` +
      `}\n` +
      `반드시 유효한 JSON만 응답하세요.`;

    const aiContent = await callOpenAI(systemPrompt, statsSummary, aiConfig.apiKey, aiConfig.model);

    let aiAnalysis: unknown;
    try {
      aiAnalysis = JSON.parse(aiContent);
    } catch {
      aiAnalysis = { raw: aiContent };
    }

    return sendSuccess({
      action: 'insights',
      period,
      totalClips,
      platformBreakdown: platformCount,
      topCategories,
      aiAnalysis,
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 402) return sendError(ErrorCodes.INSUFFICIENT_CREDITS, 'OpenAI 크레딧 부족', 402, undefined);
    console.error('[API v1 AI Insights] Error:', err);
    return errors.internalError();
  }
}

// ─── 핸들러 ───────────────────────────────────────────────────────────────────

async function handleGenerate(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const aiConfig = await resolveAIConfig(auth.publicUserId, 'default');
  if (!aiConfig.isUserKey) {
    const creditCheck = await deductCredits(auth.publicUserId, 'AI_STUDIO');
    if (!creditCheck.allowed) {
      return errors.insufficientCredits(1, Math.max(0, (creditCheck.limit ?? 0) - (creditCheck.used ?? 0)));
    }
  }

  // Body 파싱
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return sendError(ErrorCodes.INVALID_REQUEST, '요청 본문이 올바른 JSON이 아닙니다.', 400);
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

  const systemPrompt =
    `당신은 ${typeLabel} 전문 작가입니다.\n` +
    `다음 소스 자료를 바탕으로 ${toneLabel} 톤으로 ${lengthGuide}의 ${typeLabel}을(를) 작성하세요.\n\n` +
    `요구사항:\n` +
    `- 한국어로 작성\n` +
    `- ${typeInstructions}\n` +
    `- 소스 자료의 핵심 내용을 충실히 반영할 것\n` +
    '- 마크다운 문법(#, **, - 등)을 사용하지 말 것. 순수 플레인 텍스트로만 작성할 것';

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

// ─── Export ──────────────────────────────────────────────────────────────────

const routeHandler = withAuth(
  async (req, auth) => {
    if (req.method !== 'POST') return errors.methodNotAllowed(['POST']);

    // Peek at action without consuming the body (clone for generate which reads body again)
    let action = 'generate';
    let clonedReq = req;
    try {
      const cloneForPeek = req.clone();
      const peekBody = await cloneForPeek.json() as Record<string, unknown>;
      if (typeof peekBody.action === 'string') action = peekBody.action;
      // Re-clone original for downstream handlers
      clonedReq = req.clone() as NextRequest;
    } catch {
      // body not JSON or empty — fall through to generate which handles its own error
    }

    switch (action) {
      case 'analyze': return handleAnalyze(clonedReq, auth);
      case 'ask':     return handleAsk(clonedReq, auth);
      case 'insights': return handleInsights(clonedReq, auth);
      default:        return handleGenerate(clonedReq, auth);
    }
  },
  { allowedMethods: ['POST'], isAiEndpoint: true }
);

export const POST = routeHandler;
export const OPTIONS = routeHandler;
