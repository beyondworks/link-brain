// AI Service facade for Linkbrain v2
// Routes requests to OpenAI or Gemini based on user settings.
// Mirrors the orchestration logic from v1 aiService.ts.

import { callOpenAI, type AIResponse } from './openai';
import { callGemini } from './gemini';
import {
  buildStudioPrompt,
  buildChatWithClipPrompt,
  CONTENT_SUMMARY_PROMPT,
  type StudioContentType,
  type ChatClipContext,
} from './prompts';

// ─── Provider config ───────────────────────────────────────────────────────────

export type AIProvider = 'openai' | 'gemini';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export type { AIResponse, StudioContentType, ChatClipContext };

/**
 * Read AI config from environment variables (server-side default).
 * For user-supplied keys, callers should pass an explicit AIConfig.
 */
export const getServerAIConfig = (): AIConfig => ({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY ?? '',
  model: 'gpt-4o-mini',
});

/**
 * Dispatch a prompt to the configured AI provider.
 */
export const dispatchAI = async (
  config: AIConfig,
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<AIResponse> => {
  if (config.provider === 'openai') {
    return callOpenAI(config.apiKey, config.model, prompt, options);
  }
  return callGemini(config.apiKey, config.model, prompt, {
    temperature: options?.temperature,
    maxOutputTokens: options?.maxTokens,
  });
};

// ─── Key validation ────────────────────────────────────────────────────────────

export const validateApiKey = async (
  provider: AIProvider,
  apiKey: string,
  model: string
): Promise<AIResponse> => {
  try {
    if (provider === 'openai') {
      return await callOpenAI(apiKey, model, 'Say "OK" if you can hear me.', {
        maxTokens: 10,
      });
    }
    return await callGemini(apiKey, model, 'Say "OK" if you can hear me.', {
      maxOutputTokens: 10,
    });
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'API validation failed',
    };
  }
};

// ─── Summary generation ────────────────────────────────────────────────────────

export interface SummaryOptions {
  config?: AIConfig;
  language?: 'ko' | 'en';
  maxTokens?: number;
}

/**
 * Generate a summary of the given content.
 * Uses server-side config when no explicit config is provided.
 */
export const generateSummary = async (
  content: string,
  options: SummaryOptions = {}
): Promise<AIResponse> => {
  const config = options.config ?? getServerAIConfig();
  const language = options.language ?? 'ko';
  const prompt = CONTENT_SUMMARY_PROMPT(content, language);
  return dispatchAI(config, prompt, {
    temperature: 0.1,
    maxTokens: options.maxTokens ?? 600,
  });
};

// ─── Content Studio ────────────────────────────────────────────────────────────

export interface GenerateContentOptions {
  config?: AIConfig;
  language?: 'ko' | 'en';
}

/**
 * Generate studio content (report, newsletter, quiz, etc.) from selected clips.
 *
 * @param contentType - One of the 18 studio output types
 * @param sourceClips - Array of clip records (from Supabase)
 * @param options     - AI config and language override
 */
export const generateContent = async (
  contentType: StudioContentType,
  sourceClips: Array<Record<string, unknown>>,
  options: GenerateContentOptions = {}
): Promise<AIResponse> => {
  const config = options.config ?? getServerAIConfig();
  const language = options.language ?? 'ko';

  if (sourceClips.length === 0) {
    return {
      success: false,
      error:
        language === 'ko'
          ? '선택된 클립이 없습니다.'
          : 'No clips selected.',
    };
  }

  const prompt = buildStudioPrompt(sourceClips, contentType, language);
  return dispatchAI(config, prompt, { temperature: 0.7, maxTokens: 2000 });
};

// ─── AI Chat ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Chat with the AI about a specific clip, with full context awareness.
 *
 * @param message    - Latest user message
 * @param context    - Clip context (current clip + related clips + interests)
 * @param options    - AI config and language override
 */
export const chatWithClip = async (
  message: string,
  context: ChatClipContext,
  options: { config?: AIConfig; language?: 'ko' | 'en' } = {}
): Promise<AIResponse> => {
  const config = options.config ?? getServerAIConfig();
  const language = options.language ?? 'ko';
  const prompt = buildChatWithClipPrompt(message, context, language);
  return dispatchAI(config, prompt, { temperature: 0.5, maxTokens: 1000 });
};

// ─── Insights report ───────────────────────────────────────────────────────────

export interface InsightReportOptions {
  config?: AIConfig;
  language?: 'ko' | 'en';
  startDate: string;
  endDate: string;
}

export const generateInsightReport = async (
  clips: Array<Record<string, unknown>>,
  relatedClips: Array<Record<string, unknown>>,
  options: InsightReportOptions
): Promise<AIResponse> => {
  const config = options.config ?? getServerAIConfig();
  const language = options.language ?? 'ko';
  const { startDate, endDate } = options;

  const clipSummaries = clips
    .map((clip, i) => {
      const createdAt = clip.created_at ?? clip.createdAt;
      const date = createdAt
        ? new Date(createdAt as string).toISOString().split('T')[0]
        : 'Unknown';
      return `[${i + 1}] Title: ${clip.title ?? clip.url}\n    Date: ${date}\n    Keywords: ${((clip.ai_tags ?? clip.keywords ?? []) as string[]).join(', ')}\n    Summary: ${clip.summary ?? ''}`;
    })
    .join('\n\n');

  const relatedSummaries = relatedClips
    .map((clip, i) => {
      const createdAt = clip.created_at ?? clip.createdAt;
      const date = createdAt
        ? new Date(createdAt as string).toISOString().split('T')[0]
        : 'Unknown';
      return `[R-${i + 1}] Title: ${clip.title ?? clip.url}\n    Date: ${date}\n    Keywords: ${((clip.ai_tags ?? clip.keywords ?? []) as string[]).join(', ')}\n    Summary: ${clip.summary ?? ''}`;
    })
    .join('\n\n');

  const prompt =
    language === 'ko'
      ? `[인사이트 리포트 생성 요청]\n\n선택 기간(${startDate} ~ ${endDate}) 클립 (${clips.length}개):\n${clipSummaries}\n\n과거 연관 클립 (${relatedClips.length}개):\n${relatedSummaries}\n\n📌 분석 지침:\n1. 개별 요약 금지\n2. 반복 키워드·관점 변화 중심으로 하나의 큰 흐름 도출\n3. 과거 클립과의 맥락 연결\n4. '관심사의 진화' 관점에서 설명\n\n📌 출력 형식 (Markdown):\n## 핵심 인사이트 요약\n## 관심사 흐름 타임라인\n## 최근 변화의 특징\n## 주목하고 있는 핵심 주제\n## 다음 단계 제안\n\n⚠️ 제공된 클립 데이터만 사용하세요.`
      : `[Generate Insights Report]\n\nSelected period (${startDate} ~ ${endDate}) clips (${clips.length}):\n${clipSummaries}\n\nRelated past clips (${relatedClips.length}):\n${relatedSummaries}\n\n📌 Guidelines:\n1. Do NOT summarize clips individually\n2. Identify a major flow from recurring keywords and perspective shifts\n3. Connect to past clip context\n4. Explain evolution of interests\n\n📌 Output Format (Markdown):\n## Key Insights Summary\n## Interest Timeline\n## Characteristics of Recent Changes\n## Core Topics in Focus\n## Suggested Next Steps\n\n⚠️ Use ONLY the provided clip data.`;

  return dispatchAI(config, prompt, { temperature: 0.3, maxTokens: 1500 });
};
