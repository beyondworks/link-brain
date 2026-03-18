/**
 * Defuddle Extractor — Local HTML-to-content parser
 *
 * Extracts clean content, metadata, and images from raw HTML
 * without external API dependencies. Uses linkedom for server-side DOM.
 *
 * Controlled by USE_DEFUDDLE env var (default: true).
 */

import { fetchWithTimeout } from './utils';
import type { FetchedUrlContent } from './types';

export interface DefuddleResult extends FetchedUrlContent {
  published?: string;
  wordCount?: number;
}

/**
 * Check if Defuddle is enabled via feature flag
 */
export const isDefuddleEnabled = (): boolean => {
  return process.env.USE_DEFUDDLE !== 'false';
};

/**
 * Extract content from a URL using Defuddle (local parsing, no external API)
 */
export const extractWithDefuddle = async (url: string): Promise<DefuddleResult> => {
  const empty: DefuddleResult = { rawText: '', images: [] };

  try {
    // Dynamic imports to avoid bundling issues
    const [{ Defuddle }, { parseHTML }] = await Promise.all([
      import('defuddle/node'),
      import('linkedom'),
    ]);

    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
    }, 15000);

    if (!response.ok) {
      console.warn(`[Defuddle] HTTP ${response.status} for ${url}`);
      return empty;
    }

    const html = await response.text();
    if (!html || html.length < 100) return empty;

    const { document } = parseHTML(html);
    const result = await Defuddle(document, url, { markdown: true });

    const content = result.content ?? '';
    const images: string[] = [];

    // Extract image from metadata
    if (result.image) images.push(result.image);

    // Extract images from markdown content
    const imgMatches = content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g);
    for (const match of imgMatches) {
      const imgUrl = match[1];
      if (imgUrl && !imgUrl.startsWith('data:') && !images.includes(imgUrl)) {
        images.push(imgUrl);
      }
    }

    return {
      rawText: content,
      htmlContent: html,
      images,
      title: result.title ?? undefined,
      description: result.description ?? undefined,
      author: result.author ?? undefined,
      published: result.published ?? undefined,
      wordCount: result.wordCount ?? undefined,
    };
  } catch (err) {
    console.warn('[Defuddle] Extraction failed:', err);
    return empty;
  }
};
