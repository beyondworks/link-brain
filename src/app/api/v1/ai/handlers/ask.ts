import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { type AuthContext } from '@/lib/api/middleware';
import { errors, sendError, ErrorCodes } from '@/lib/api/response';
import { deductCredits } from '@/lib/services/plan-service';
import { CHAT_TOOL_DEFINITIONS, executeTool } from '@/lib/ai/chat-tools';
import { resolveAIConfig, type ResolvedAIConfig } from '@/lib/ai/model-resolver';
import { streamAI, callAIWithTools, type ChatMessage, type ToolDefinition } from '../helpers/openai-stream';
import { type ClipRow } from '../types';

const db = supabaseAdmin;

// ─── Ask Legacy 핸들러 (clipIds 직접 지정) ──────────────────────────────────

async function handleAskLegacy(
  auth: AuthContext,
  message: string,
  clipIds: string[],
  conversationId: string | null,
  language: string,
  aiConfig: ResolvedAIConfig,
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
          for await (const chunk of streamAI(aiConfig, systemPrompt, message)) {
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
    if (status === 402) return sendError(ErrorCodes.INSUFFICIENT_CREDITS, 'AI 크레딧 부족', 402, undefined);
    console.error('[API v1 AI Ask Legacy] Error:', err);
    return errors.internalError();
  }
}

// ─── Ask 핸들러 (Function Calling) ──────────────────────────────────────────

export async function handleAsk(rawBody: unknown, auth: AuthContext): Promise<NextResponse> {
  const aiConfig = await resolveAIConfig(auth.publicUserId, 'chat');
  if (!aiConfig.isUserKey) {
    const creditCheck = await deductCredits(auth.publicUserId, 'AI_CHAT');
    if (!creditCheck.allowed) {
      return errors.insufficientCredits(1, Math.max(0, (creditCheck.limit ?? 0) - (creditCheck.used ?? 0)));
    }
  }

  const obj = rawBody as Record<string, unknown>;
  const message = typeof obj.message === 'string' ? obj.message.trim() : '';
  if (!message) return sendError(ErrorCodes.INVALID_REQUEST, '"message" 필드가 필요합니다.', 400);

  const clipIds = Array.isArray(obj.clipIds) ? (obj.clipIds as string[]) : [];
  const conversationId = typeof obj.conversationId === 'string' ? obj.conversationId : null;
  const language = obj.language === 'en' ? 'en' : 'ko';

  // ─── Legacy mode: if clipIds provided, use direct context (no function calling) ──
  if (clipIds.length > 0) {
    return handleAskLegacy(auth, message, clipIds, conversationId, language, aiConfig);
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
    'UI 용어 사전 (응답 시 → 뒤의 정식 명칭을 사용):\n' +
    '- 클립: 저장된 개별 콘텐츠. 사용자가 "링크", "북마크", "저장한 글"이라고 하면 → 클립\n' +
    '- 컬렉션: 일반 클립을 묶는 그룹. "폴더", "모음"이라고 하면 → 컬렉션\n' +
    '- 앨범: 이미지 전용 그룹 (이미지 페이지에서 관리). "이미지 폴더"라고 하면 → 앨범\n' +
    '- 이미지: platform이 "image"인 클립 (업로드된 이미지 파일). "사진", "그림", "이미지 파일"이라고 하면 → 이미지 클립\n' +
    '- 카테고리: 클립의 주제 분류 (Dev, Design 등). "분류", "주제"라고 하면 → 카테고리\n' +
    '- 즐겨찾기: 중요 표시. "좋아요", "별표", "스타"라고 하면 → 즐겨찾기\n' +
    '- 나중에 읽기: 읽기 예정 표시. "읽을거리", "나중에 볼 것"이라고 하면 → 나중에 읽기\n' +
    '- 아카이브: 보관 처리. "보관함", "치워둔 것"이라고 하면 → 아카이브\n' +
    '- 태그: 클립에 붙은 키워드. "라벨", "해시태그"라고 하면 → 태그\n' +
    '- 스튜디오: 콘텐츠 생성 도구. "글쓰기", "콘텐츠 만들기"라고 하면 → 스튜디오\n' +
    '- 인사이트: 클립 분석 리포트. "분석", "통계", "리포트"라고 하면 → 인사이트\n\n' +
    '도구 사용 규칙:\n' +
    '- 사용자 질문에 답하기 위해 필요한 도구를 자유롭게 호출하세요\n' +
    '- 키워드 검색에는 search_clips, 의미 기반 검색에는 find_similar_clips를 사용하세요\n' +
    '- 특정 클립의 상세 내용이 필요하면 get_clip_content를 사용하세요\n' +
    '- 컬렉션, 카테고리, 태그 현황 질문에는 해당 list_ 도구를 사용하세요\n' +
    '- 이미지 관련 요청: list_clips(platform: "image")로 이미지 클립 조회, list_image_albums로 앨범 조회\n' +
    '- 이미지를 앨범으로 옮기려면: list_clips(platform: "image") → list_image_albums → propose_action(action: "add_to_image_album")\n' +
    '- 도구 결과를 바탕으로 정확하고 구체적으로 답변하세요\n' +
    '- 어떤 클립을 참조했는지 답변에 포함하세요\n' +
    '- 관련 정보가 없으면 솔직히 알려주세요\n\n' +
    '즉시 실행 도구:\n' +
    '- create_collection: 새 컬렉션 생성 (즉시 실행, 확인 불필요)\n' +
    '- update_clip_notes: 클립 메모 추가/수정 (즉시 실행)\n' +
    '- find_duplicate_clips: 중복 클립 탐지\n' +
    '- get_clip_stats: 클립 통계 요약\n\n' +
    '쓰기 도구 규칙:\n' +
    '- 클립을 이동, 아카이브, 컬렉션 추가, 태그 일괄 추가 등 변경하려면 반드시 propose_action을 먼저 호출\n' +
    '- propose_action의 bulk_tag: 클립에 태그 일괄 추가 (tags 배열 필수)\n' +
    '- 직접 변경하지 말고 항상 계획을 먼저 제안\n' +
    '- 삭제(delete)는 지원하지 않음 — 사용자에게 직접 UI 안내\n' +
    '- 대상 클립을 search_clips 또는 list_clips로 먼저 찾은 후 propose_action 호출';

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({ role: msg.role as ChatMessage['role'], content: msg.content });
  }

  // Add current user message
  messages.push({ role: 'user', content: message });

  try {
    // ─── Function calling loop (max 5 iterations) ──────────────────
    const collectedClipIds: string[] = [];
    let finalResponse = '';
    let pendingAction: Record<string, unknown> | null = null;
    const MAX_TOOL_ROUNDS = 5;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const result = await callAIWithTools(
        aiConfig,
        messages,
        CHAT_TOOL_DEFINITIONS as unknown as ToolDefinition[],
      );

      // If no tool calls, we have the final answer
      if (result.toolCalls.length === 0) {
        finalResponse = result.content ?? '';
        break;
      }

      // Add assistant message with tool calls to history
      messages.push({
        role: 'assistant',
        content: result.content ?? undefined,
        tool_calls: result.toolCalls,
      });

      // Execute each tool call
      for (const toolCall of result.toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        } catch {
          args = {};
        }

        const toolResult = await executeTool(toolCall.function.name, args, auth.publicUserId);

        // Collect clip IDs from results
        try {
          const parsed = JSON.parse(toolResult) as { __type?: string; clips?: Array<{ id?: string }> };

          // Detect pending_action from propose_action tool
          if (parsed.__type === 'pending_action') {
            pendingAction = parsed as Record<string, unknown>;
          }

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
          name: toolCall.function.name,
          content: toolResult,
        });
      }

      // If a pending action was detected, prompt AI to explain it and break
      if (pendingAction) {
        messages.push({
          role: 'user',
          content: '위 작업 계획을 사용자에게 자연스럽게 설명하고, 진행할지 물어보세요.',
        });

        // One more call with full context to get the explanation text (no tools)
        const explainResult = await callAIWithTools(aiConfig, messages, []);
        finalResponse = explainResult.content ?? '';
        break;
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
          ...(pendingAction ? { pendingAction } : {}),
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
    if (status === 402) return sendError(ErrorCodes.INSUFFICIENT_CREDITS, 'AI 크레딧 부족', 402, undefined);
    console.error('[API v1 AI Ask] Error:', err);
    return errors.internalError();
  }
}
