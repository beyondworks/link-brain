/**
 * Multi-Provider AI Client
 *
 * Routes chat completion requests to OpenAI, Anthropic, or Google
 * based on ResolvedAIConfig.provider.
 *
 * Provides:
 * - chat()          — non-streaming completion
 * - chatStream()    — streaming completion (async generator)
 * - chatWithTools() — function calling (non-streaming, for tool loop)
 */

import { type ResolvedAIConfig } from './model-resolver';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}

/** OpenAI-format tool definition (canonical format used throughout the app) */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatWithToolsResponse {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: string;
}

// ─── Non-Streaming Chat ─────────────────────────────────────────────────────

export async function chat(
  config: ResolvedAIConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  switch (config.provider) {
    case 'anthropic':
      return chatAnthropic(config, systemPrompt, userPrompt);
    case 'google':
      return chatGoogle(config, systemPrompt, userPrompt);
    default:
      return chatOpenAI(config, systemPrompt, userPrompt);
  }
}

// ─── Streaming Chat ─────────────────────────────────────────────────────────

export async function* chatStream(
  config: ResolvedAIConfig,
  systemPrompt: string,
  userPrompt: string,
): AsyncGenerator<string> {
  switch (config.provider) {
    case 'anthropic':
      yield* chatStreamAnthropic(config, systemPrompt, userPrompt);
      break;
    case 'google':
      yield* chatStreamGoogle(config, systemPrompt, userPrompt);
      break;
    default:
      yield* chatStreamOpenAI(config, systemPrompt, userPrompt);
      break;
  }
}

// ─── Chat with Tools (function calling) ─────────────────────────────────────

export async function chatWithTools(
  config: ResolvedAIConfig,
  messages: ChatMessage[],
  tools: ToolDefinition[],
): Promise<ChatWithToolsResponse> {
  // Empty tools = plain chat completion (no tool calling)
  if (tools.length === 0) {
    return chatWithoutTools(config, messages);
  }

  switch (config.provider) {
    case 'anthropic':
      return chatWithToolsAnthropic(config, messages, tools);
    case 'google':
      return chatWithToolsGoogle(config, messages, tools);
    default:
      return chatWithToolsOpenAI(config, messages, tools);
  }
}

/** Plain chat completion from a messages array (no tools) */
async function chatWithoutTools(
  config: ResolvedAIConfig,
  messages: ChatMessage[],
): Promise<ChatWithToolsResponse> {
  // Extract system prompt and last user message for the chat() interface
  let system = '';
  let lastUser = '';
  for (const msg of messages) {
    if (msg.role === 'system') system += (system ? '\n\n' : '') + (msg.content ?? '');
    if (msg.role === 'user') lastUser = msg.content ?? '';
  }

  const content = await chat(config, system, lastUser);
  return { content, toolCalls: [], finishReason: 'stop' };
}

// ═══════════════════════════════════════════════════════════════════════════
// OpenAI Implementation
// ═══════════════════════════════════════════════════════════════════════════

function openaiHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

function openaiTokenParams(model: string, maxTokens: number): Record<string, number> {
  const isNew =
    model.startsWith('gpt-5') ||
    model.startsWith('o1') ||
    model.startsWith('o3') ||
    model.startsWith('o4');
  return isNew ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens };
}

async function chatOpenAI(
  config: ResolvedAIConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: openaiHeaders(config.apiKey),
    body: JSON.stringify({
      model: config.model,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ...openaiTokenParams(config.model, 4000),
    }),
  });

  if (!res.ok) {
    await throwProviderError('OpenAI', res);
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return json.choices[0]?.message?.content ?? '';
}

async function* chatStreamOpenAI(
  config: ResolvedAIConfig,
  systemPrompt: string,
  userPrompt: string,
): AsyncGenerator<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: openaiHeaders(config.apiKey),
    body: JSON.stringify({
      model: config.model,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    await throwProviderError('OpenAI', res);
  }

  yield* parseSSEStream(res, (json: string) => {
    const chunk = JSON.parse(json) as {
      choices: Array<{ delta: { content?: string } }>;
    };
    return chunk.choices[0]?.delta?.content ?? null;
  });
}

async function chatWithToolsOpenAI(
  config: ResolvedAIConfig,
  messages: ChatMessage[],
  tools: ToolDefinition[],
): Promise<ChatWithToolsResponse> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: openaiHeaders(config.apiKey),
    body: JSON.stringify({
      model: config.model,
      messages,
      tools,
      tool_choice: 'auto',
    }),
  });

  if (!res.ok) {
    await throwProviderError('OpenAI', res);
  }

  const json = (await res.json()) as {
    choices: Array<{
      message: { role: string; content: string | null; tool_calls?: ToolCall[] };
      finish_reason: string;
    }>;
  };

  const choice = json.choices[0];
  return {
    content: choice.message.content,
    toolCalls: choice.message.tool_calls ?? [],
    finishReason: choice.finish_reason,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Anthropic Implementation
// ═══════════════════════════════════════════════════════════════════════════

function anthropicHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };
}

/** Convert OpenAI messages to Anthropic format (extract system, map roles) */
function toAnthropicMessages(messages: ChatMessage[]): {
  system: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<{ type: string; tool_use_id?: string; content?: string; id?: string; name?: string; input?: unknown; text?: string }>;
  }>;
} {
  let system = '';
  const out: Array<{
    role: 'user' | 'assistant';
    content: string | Array<{ type: string; tool_use_id?: string; content?: string; id?: string; name?: string; input?: unknown; text?: string }>;
  }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      system += (system ? '\n\n' : '') + (msg.content ?? '');
      continue;
    }

    if (msg.role === 'tool') {
      // Anthropic: tool results are user messages with tool_result content blocks
      out.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: msg.tool_call_id ?? '',
            content: msg.content ?? '',
          },
        ],
      });
      continue;
    }

    if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
      // Assistant message with tool calls
      const blocks: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }> = [];
      if (msg.content) {
        blocks.push({ type: 'text', text: msg.content });
      }
      for (const tc of msg.tool_calls) {
        let parsedInput: unknown = {};
        try { parsedInput = JSON.parse(tc.function.arguments); } catch { /* */ }
        blocks.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.function.name,
          input: parsedInput,
        });
      }
      out.push({ role: 'assistant', content: blocks });
      continue;
    }

    out.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content ?? '',
    });
  }

  return { system, messages: out };
}

/** Convert OpenAI tool definitions to Anthropic format */
function toAnthropicTools(tools: ToolDefinition[]): Array<{
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}> {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}

async function chatAnthropic(
  config: ResolvedAIConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: anthropicHeaders(config.apiKey),
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    await throwProviderError('Anthropic', res);
  }

  const json = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  return json.content.find((b) => b.type === 'text')?.text ?? '';
}

async function* chatStreamAnthropic(
  config: ResolvedAIConfig,
  systemPrompt: string,
  userPrompt: string,
): AsyncGenerator<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: anthropicHeaders(config.apiKey),
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4000,
      stream: true,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    await throwProviderError('Anthropic', res);
  }

  yield* parseSSEStream(res, (json: string) => {
    const event = JSON.parse(json) as {
      type: string;
      delta?: { type?: string; text?: string };
    };
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      return event.delta.text ?? null;
    }
    return null;
  });
}

async function chatWithToolsAnthropic(
  config: ResolvedAIConfig,
  messages: ChatMessage[],
  tools: ToolDefinition[],
): Promise<ChatWithToolsResponse> {
  const { system, messages: anthropicMsgs } = toAnthropicMessages(messages);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: anthropicHeaders(config.apiKey),
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4000,
      system,
      messages: anthropicMsgs,
      tools: toAnthropicTools(tools),
    }),
  });

  if (!res.ok) {
    await throwProviderError('Anthropic', res);
  }

  const json = (await res.json()) as {
    content: Array<{
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
    stop_reason: string;
  };

  // Convert Anthropic tool_use blocks to OpenAI-format ToolCall
  const textContent = json.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const toolCalls: ToolCall[] = json.content
    .filter((b) => b.type === 'tool_use')
    .map((b) => ({
      id: b.id ?? '',
      type: 'function' as const,
      function: {
        name: b.name ?? '',
        arguments: JSON.stringify(b.input ?? {}),
      },
    }));

  return {
    content: textContent || null,
    toolCalls,
    finishReason: json.stop_reason === 'tool_use' ? 'tool_calls' : json.stop_reason,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Google Gemini Implementation
// ═══════════════════════════════════════════════════════════════════════════

function geminiUrl(model: string, apiKey: string, stream: boolean): string {
  const method = stream ? 'streamGenerateContent' : 'generateContent';
  const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}?key=${apiKey}`;
  return stream ? `${base}&alt=sse` : base;
}

/** Convert OpenAI messages to Gemini format */
function toGeminiContents(messages: ChatMessage[]): {
  systemInstruction: { parts: Array<{ text: string }> } | undefined;
  contents: Array<{
    role: 'user' | 'model';
    parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: unknown } }>;
  }>;
} {
  let systemText = '';
  const contents: Array<{
    role: 'user' | 'model';
    parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: unknown } }>;
  }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemText += (systemText ? '\n\n' : '') + (msg.content ?? '');
      continue;
    }

    if (msg.role === 'tool') {
      // Gemini: functionResponse in user turn
      let parsed: unknown = {};
      try { parsed = JSON.parse(msg.content ?? '{}'); } catch { parsed = { result: msg.content }; }
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: msg.name ?? 'unknown',
            response: parsed,
          },
        }],
      });
      continue;
    }

    if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
      const parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      for (const tc of msg.tool_calls) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments) as Record<string, unknown>; } catch { /* */ }
        parts.push({
          functionCall: { name: tc.function.name, args },
        });
      }
      contents.push({ role: 'model', parts });
      continue;
    }

    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content ?? '' }],
    });
  }

  return {
    systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
    contents,
  };
}

/** Convert OpenAI tool definitions to Gemini format */
function toGeminiTools(tools: ToolDefinition[]): Array<{
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}> {
  return [{
    functionDeclarations: tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    })),
  }];
}

async function chatGoogle(
  config: ResolvedAIConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch(geminiUrl(config.model, config.apiKey, false), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 4000 },
    }),
  });

  if (!res.ok) {
    await throwProviderError('Google', res);
  }

  const json = (await res.json()) as {
    candidates: Array<{
      content: { parts: Array<{ text?: string }> };
    }>;
  };
  return json.candidates?.[0]?.content?.parts
    ?.filter((p) => p.text)
    .map((p) => p.text)
    .join('') ?? '';
}

async function* chatStreamGoogle(
  config: ResolvedAIConfig,
  systemPrompt: string,
  userPrompt: string,
): AsyncGenerator<string> {
  const res = await fetch(geminiUrl(config.model, config.apiKey, true), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 4000 },
    }),
  });

  if (!res.ok) {
    await throwProviderError('Google', res);
  }

  yield* parseSSEStream(res, (json: string) => {
    const chunk = JSON.parse(json) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    return chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  });
}

async function chatWithToolsGoogle(
  config: ResolvedAIConfig,
  messages: ChatMessage[],
  tools: ToolDefinition[],
): Promise<ChatWithToolsResponse> {
  const { systemInstruction, contents } = toGeminiContents(messages);

  const res = await fetch(geminiUrl(config.model, config.apiKey, false), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(systemInstruction ? { systemInstruction } : {}),
      contents,
      tools: toGeminiTools(tools),
      generationConfig: { maxOutputTokens: 4000 },
    }),
  });

  if (!res.ok) {
    await throwProviderError('Google', res);
  }

  const json = (await res.json()) as {
    candidates: Array<{
      content: {
        parts: Array<{
          text?: string;
          functionCall?: { name: string; args: Record<string, unknown> };
        }>;
      };
      finishReason: string;
    }>;
  };

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const finishReason = json.candidates?.[0]?.finishReason ?? 'STOP';

  const textContent = parts
    .filter((p) => p.text)
    .map((p) => p.text)
    .join('');

  // Convert Gemini functionCall to OpenAI-format ToolCall
  let callIndex = 0;
  const toolCalls: ToolCall[] = parts
    .filter((p) => p.functionCall)
    .map((p) => ({
      id: `call_gemini_${callIndex++}`,
      type: 'function' as const,
      function: {
        name: p.functionCall!.name,
        arguments: JSON.stringify(p.functionCall!.args ?? {}),
      },
    }));

  return {
    content: textContent || null,
    toolCalls,
    finishReason: toolCalls.length > 0 ? 'tool_calls' : finishReason,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared Utilities
// ═══════════════════════════════════════════════════════════════════════════

/** Parse SSE stream and yield extracted text via a provider-specific parser */
async function* parseSSEStream(
  res: Response,
  extractText: (json: string) => string | null,
): AsyncGenerator<string> {
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
          const text = extractText(jsonStr);
          if (text) yield text;
        } catch {
          // JSON parse failure — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Throw a formatted error from a provider response */
async function throwProviderError(provider: string, res: Response): Promise<never> {
  const errText = await res.text().catch(() => '');
  if (res.status === 429) {
    throw Object.assign(
      new Error(`${provider} 요청 한도 초과 또는 크레딧 부족`),
      { status: 402 },
    );
  }
  throw new Error(`${provider} API 오류 (${res.status}): ${errText}`);
}
