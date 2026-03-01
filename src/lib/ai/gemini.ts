// Google Gemini provider for Linkbrain v2
// Used as an alternative AI backend to OpenAI

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Call the Gemini generateContent API.
 * Model name must be a valid Gemini model identifier (e.g. 'gemini-2.5-flash').
 */
export const callGemini = async (
  apiKey: string,
  model: string,
  prompt: string,
  options?: { temperature?: number; maxOutputTokens?: number }
): Promise<AIResponse> => {
  try {
    const actualModel = model || 'gemini-2.5-flash';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxOutputTokens ?? 2000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { error?: { message?: string } }).error?.message ||
          `Gemini API error: ${response.status}`
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const content =
      data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return { success: true, content };
  } catch (error: unknown) {
    console.error('[Gemini] error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gemini API call failed',
    };
  }
};

/**
 * Validate a Gemini API key by making a minimal test request.
 */
export const validateGeminiKey = async (
  apiKey: string,
  model: string
): Promise<AIResponse> => {
  return callGemini(apiKey, model, 'Say "OK" if you can hear me.', {
    maxOutputTokens: 10,
  });
};
