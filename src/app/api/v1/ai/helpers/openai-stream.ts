// ─── Multi-Provider AI 헬퍼 ──────────────────────────────────────────────────
// 하위호환: 기존 streamOpenAI / callOpenAI 시그니처 유지
// provider-client를 통해 OpenAI / Anthropic / Google 자동 라우팅

import { type ResolvedAIConfig } from '@/lib/ai/model-resolver';
import {
  chat as providerChat,
  chatStream as providerChatStream,
  chatWithTools as providerChatWithTools,
  type ChatMessage,
  type ToolDefinition,
  type ChatWithToolsResponse,
} from '@/lib/ai/provider-client';

// ─── ResolvedAIConfig 기반 스트리밍 ─────────────────────────────────────────

export async function* streamAI(
  config: ResolvedAIConfig,
  systemPrompt: string,
  userPrompt: string,
): AsyncGenerator<string> {
  yield* providerChatStream(config, systemPrompt, userPrompt);
}

// ─── ResolvedAIConfig 기반 비스트리밍 ───────────────────────────────────────

export async function callAI(
  config: ResolvedAIConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  return providerChat(config, systemPrompt, userPrompt);
}

// ─── ResolvedAIConfig 기반 Tool Calling ─────────────────────────────────────

export async function callAIWithTools(
  config: ResolvedAIConfig,
  messages: ChatMessage[],
  tools: ToolDefinition[],
): Promise<ChatWithToolsResponse> {
  return providerChatWithTools(config, messages, tools);
}

// ─── 하위호환: 기존 시그니처 (apiKey/model 직접 전달) ──────────────────────
// 이 함수들은 항상 OpenAI 엔드포인트를 사용합니다.
// provider-aware 버전은 위의 streamAI / callAI를 사용하세요.

export async function* streamOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey?: string,
  model?: string,
): AsyncGenerator<string> {
  const config: ResolvedAIConfig = {
    provider: 'openai',
    apiKey: apiKey ?? process.env.OPENAI_API_KEY ?? '',
    model: model ?? 'gpt-4o-mini',
    isUserKey: !!apiKey,
  };

  if (!config.apiKey) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
  }

  yield* providerChatStream(config, systemPrompt, userPrompt);
}

export async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey?: string,
  model?: string,
): Promise<string> {
  const config: ResolvedAIConfig = {
    provider: 'openai',
    apiKey: apiKey ?? process.env.OPENAI_API_KEY ?? '',
    model: model ?? 'gpt-4o-mini',
    isUserKey: !!apiKey,
  };

  if (!config.apiKey) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
  }

  return providerChat(config, systemPrompt, userPrompt);
}

// Re-export types for consumers
export type { ChatMessage, ToolDefinition, ChatWithToolsResponse };
