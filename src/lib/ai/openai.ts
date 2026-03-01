// OpenAI provider for Linkbrain v2
// Uses fetch directly (no openai npm package required).
// Handles chat completions (GPT-4o-mini) and embeddings (text-embedding-3-small).

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface OpenAIEmbeddingResponse {
  data?: Array<{ embedding: number[] }>;
}

interface OpenAIErrorResponse {
  error?: { message?: string };
}

/**
 * Call OpenAI chat completions API.
 * Supports GPT-4o, GPT-4o-mini, o1/o3/o4 series (uses max_completion_tokens).
 */
export const callOpenAI = async (
  apiKey: string,
  model: string,
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<AIResponse> => {
  try {
    const actualModel = model || 'gpt-4o';
    const isNewModel =
      actualModel.startsWith('gpt-5') ||
      actualModel.startsWith('o1') ||
      actualModel.startsWith('o3') ||
      actualModel.startsWith('o4');

    const maxTokens = options?.maxTokens ?? 2000;
    const tokenParams = isNewModel
      ? { max_completion_tokens: maxTokens }
      : { max_tokens: maxTokens };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: actualModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.7,
        ...tokenParams,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as OpenAIErrorResponse;
      throw new Error(errorData.error?.message ?? `OpenAI API error: ${response.status}`);
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const content = data.choices?.[0]?.message?.content ?? '';
    return { success: true, content };
  } catch (error: unknown) {
    console.error('[OpenAI] error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OpenAI API call failed',
    };
  }
};

/**
 * Generate a chat completion using the server-side OPENAI_API_KEY env var.
 * Used internally for clip metadata generation, summaries, etc.
 */
export const generateChatCompletion = async (
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> => {
  const model = options?.model ?? 'gpt-4o-mini';
  const isNewModel =
    model.startsWith('gpt-5') ||
    model.startsWith('o1') ||
    model.startsWith('o3') ||
    model.startsWith('o4');

  const maxTokens = options?.maxTokens ?? 600;
  const tokenParams = isNewModel
    ? { max_completion_tokens: maxTokens }
    : { max_tokens: maxTokens };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.1,
      ...tokenParams,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as OpenAIErrorResponse;
    throw new Error(errorData.error?.message ?? `OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as OpenAIChatResponse;
  return data.choices?.[0]?.message?.content ?? '';
};

/**
 * Generate a text embedding using text-embedding-3-small (1536 dimensions).
 * Uses the server-side OPENAI_API_KEY env var.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000),
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as OpenAIErrorResponse;
    throw new Error(errorData.error?.message ?? `OpenAI Embeddings error: ${response.status}`);
  }

  const data = (await response.json()) as OpenAIEmbeddingResponse;
  const embedding = data.data?.[0]?.embedding;
  if (!embedding) throw new Error('No embedding returned from OpenAI');
  return embedding;
};

/**
 * Validate an OpenAI API key by making a minimal test request.
 */
export const validateOpenAIKey = async (
  apiKey: string,
  model: string
): Promise<AIResponse> => {
  return callOpenAI(apiKey, model, 'Say "OK" if you can hear me.', {
    maxTokens: 10,
  });
};
