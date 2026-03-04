/**
 * Readability Fetcher — Fallback using Mozilla Readability + JSDOM
 *
 * Used when Jina Reader fails or returns weak results.
 * Fetches raw HTML, parses with JSDOM, extracts with Readability.
 */

import { validateUrl } from './url-validator';
import { fetchWithTimeout, extractImagesFromHtml } from './utils';
import type { FetchedUrlContent } from './types';

/**
 * Extract content from a URL using Mozilla Readability + JSDOM
 */
export async function extractWithReadability(url: string): Promise<FetchedUrlContent> {
  const urlValidation = validateUrl(url);
  if (!urlValidation.valid) {
    console.error(`[Readability] SSRF blocked: ${urlValidation.error}`);
    return { rawText: '', images: [] };
  }

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Linkbrain/2.0; +https://linkbrain.cloud)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    }, 15000);

    if (!response.ok) {
      console.warn(`[Readability] HTTP ${response.status} for ${url}`);
      return { rawText: '', images: [] };
    }

    const html = await response.text();
    if (!html || html.length < 100) {
      return { rawText: '', images: [] };
    }

    // Dynamic import to avoid ESM require() error on Vercel
    const { JSDOM } = await import('jsdom');
    const { Readability } = await import('@mozilla/readability');

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.trim().length < 50) {
      console.warn('[Readability] Insufficient content extracted');
      return { rawText: '', images: [] };
    }

    // Extract images from the article HTML content
    const images = article.content ? extractImagesFromHtml(article.content) : [];

    return {
      rawText: article.textContent.trim(),
      htmlContent: article.content || undefined,
      images,
      title: article.title || undefined,
    };
  } catch (error) {
    console.error('[Readability] Extraction failed:', error);
    return { rawText: '', images: [] };
  }
}
