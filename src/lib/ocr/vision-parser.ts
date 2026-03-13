/**
 * OCR parser for image clips.
 *
 * Pipeline:
 *   Single GPT-4o-mini vision call — directly analyzes the image URL.
 *
 * Replaces the previous Tesseract.js + LLM two-step pipeline which failed
 * in Vercel serverless due to language data download timeouts (~30MB for kor+eng).
 */

export interface VisionParseResult {
  summary: string;
  fullContent: string;
  tables: Array<{ headers: string[]; rows: string[][] }>;
  metadata: {
    language: string;
    documentType: string;
    hasTable: boolean;
    hasChart: boolean;
  };
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface OpenAIErrorResponse {
  error?: { message?: string };
}

const VISION_PROMPT = `You are a document OCR and analysis specialist. Analyze this image and extract all text content.

Rules:
1. Extract ALL visible text exactly as shown — do not add or omit content.
2. Fix obvious OCR-like artifacts but NEVER guess at names or numbers.
3. If the image contains tabular data, format it as a Markdown table.
4. Detect the document language and type.
5. Write a 2-3 sentence summary in the same language as the document.
6. If the image has no text, describe the image content briefly.

Return a JSON object with this exact structure:
{
  "summary": "2-3 sentence summary in the document's language",
  "fullContent": "All extracted text restructured in clean Markdown",
  "tables": [{"headers": ["col1","col2"], "rows": [["val1","val2"]]}],
  "metadata": {
    "language": "ko" or "en" or other ISO code,
    "documentType": "receipt|document|screenshot|handwritten|diagram|photo|other",
    "hasTable": true/false,
    "hasChart": true/false
  }
}`;

/**
 * Parse an image using a single GPT-4o-mini vision API call.
 *
 * @param imageUrl - Public URL of the image
 * @returns Parsed content with summary, full content, tables, and metadata
 */
export async function parseImageWithVision(imageUrl: string): Promise<VisionParseResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('[VisionParser] OPENAI_API_KEY is not configured');
  }

  console.warn('[VisionParser] Starting GPT-4o-mini vision analysis...');
  const startTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: VISION_PROMPT },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as OpenAIErrorResponse;
    const message = errorData.error?.message ?? `OpenAI API error: ${response.status}`;
    console.error('[VisionParser] Vision API error:', message);
    throw new Error(message);
  }

  const data = (await response.json()) as OpenAIChatResponse;
  const rawContent = data.choices?.[0]?.message?.content ?? '';

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.warn(`[VisionParser] Vision analysis done in ${elapsed}s`);

  const jsonText = rawContent
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(jsonText) as VisionParseResult;

  return {
    summary: parsed.summary ?? '',
    fullContent: parsed.fullContent ?? '',
    tables: Array.isArray(parsed.tables) ? parsed.tables : [],
    metadata: {
      language: parsed.metadata?.language ?? 'ko',
      documentType: parsed.metadata?.documentType ?? 'other',
      hasTable: parsed.metadata?.hasTable ?? false,
      hasChart: parsed.metadata?.hasChart ?? false,
    },
  };
}
