/**
 * OCR parser for image clips.
 *
 * Pipeline:
 *   1. Tesseract.js — accurate text extraction (kor + eng)
 *   2. GPT-4o-mini  — structure/summarize the extracted text (no image input)
 *
 * This separation eliminates LLM hallucination in OCR:
 *   - Tesseract extracts exactly what's in the image
 *   - LLM only organises the already-extracted text
 */

import Tesseract from 'tesseract.js';
import sharp from 'sharp';

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

const STRUCTURE_PROMPT = `You are a document structuring specialist. You receive raw OCR text and organise it into clean Markdown.

Rules:
1. Do NOT add, remove, or change any text — only restructure.
2. Fix obvious OCR artefacts (broken words, stray characters) but NEVER guess names or numbers.
3. If the text contains tabular data, format it as a Markdown table.
4. Detect the document language and type.
5. Write a 2-3 sentence summary in the same language as the document.

Return a JSON object with this exact structure:
{
  "summary": "2-3 sentence summary in the document's language",
  "fullContent": "Restructured text in Markdown",
  "tables": [{"headers": ["col1","col2"], "rows": [["val1","val2"]]}],
  "metadata": {
    "language": "ko" or "en" or other ISO code,
    "documentType": "receipt|document|screenshot|handwritten|diagram|other",
    "hasTable": true/false,
    "hasChart": true/false
  }
}`;

/**
 * Download and preprocess image with sharp:
 * - EXIF auto-rotate (fixes 90° rotated photos)
 * - Grayscale + contrast normalization
 * - Resize to ensure 300+ DPI equivalent
 */
async function preprocessImage(imageUrl: string): Promise<Buffer> {
  console.log('[VisionParser] Preprocessing image...');
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();

  return sharp(Buffer.from(arrayBuffer))
    .rotate()           // auto-rotate from EXIF metadata
    .grayscale()        // remove color noise
    .normalize()        // stretch contrast for cleaner OCR
    .resize({ width: 2000, withoutEnlargement: true })
    .extend({ top: 10, bottom: 10, left: 10, right: 10, background: '#ffffff' })
    .png()
    .toBuffer();
}

/**
 * Extract text from an image using Tesseract.js (kor + eng).
 * Image is preprocessed with sharp before OCR.
 */
async function extractTextWithTesseract(imageUrl: string): Promise<string> {
  console.log('[VisionParser] Starting Tesseract OCR...');
  const startTime = Date.now();

  const preprocessed = await preprocessImage(imageUrl);

  const result = await Tesseract.recognize(preprocessed, 'kor+eng', {
    logger: (info: { status: string }) => {
      if (info.status === 'recognizing text') {
        console.log('[VisionParser] Tesseract recognizing...');
      }
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const text = result.data.text.trim();
  console.log(`[VisionParser] Tesseract done in ${elapsed}s — ${text.length} chars, confidence ${result.data.confidence}%`);

  return text;
}

/**
 * Structure raw OCR text using GPT-4o-mini (text-only, no image).
 */
async function structureWithLLM(rawText: string): Promise<VisionParseResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: STRUCTURE_PROMPT },
        { role: 'user', content: `Raw OCR text:\n\n${rawText}` },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as OpenAIErrorResponse;
    const message = errorData.error?.message ?? `OpenAI API error: ${response.status}`;
    console.error('[VisionParser] LLM structuring error:', message);
    throw new Error(message);
  }

  const data = (await response.json()) as OpenAIChatResponse;
  const rawContent = data.choices?.[0]?.message?.content ?? '';

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

/**
 * Parse an image: Tesseract OCR → GPT-4o-mini structuring.
 *
 * @param imageUrl - Public URL of the image
 * @returns Parsed content with summary, full content, tables, and metadata
 */
export async function parseImageWithVision(imageUrl: string): Promise<VisionParseResult> {
  // Step 1: Extract text with Tesseract.js
  const rawText = await extractTextWithTesseract(imageUrl);

  if (!rawText || rawText.length < 10) {
    console.warn('[VisionParser] Tesseract extracted very little text, returning minimal result');
    return {
      summary: '이미지에서 텍스트를 추출하지 못했습니다.',
      fullContent: rawText || '',
      tables: [],
      metadata: {
        language: 'ko',
        documentType: 'other',
        hasTable: false,
        hasChart: false,
      },
    };
  }

  // Step 2: Structure with LLM
  try {
    return await structureWithLLM(rawText);
  } catch (err) {
    console.error('[VisionParser] LLM structuring failed, returning raw text:', err);
    // Fallback: return raw Tesseract output without structuring
    return {
      summary: rawText.substring(0, 200),
      fullContent: rawText,
      tables: [],
      metadata: {
        language: 'ko',
        documentType: 'other',
        hasTable: false,
        hasChart: false,
      },
    };
  }
}
