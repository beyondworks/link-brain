/**
 * Puppeteer Extractor — Stub for v2
 *
 * Puppeteer is not available in the Next.js edge/serverless environment.
 * This stub returns empty content. Replace with a real implementation
 * (e.g., a dedicated scraping service or Browserless) when needed.
 */

import type { FetchedUrlContent } from './types';

export const extractWithPuppeteer = async (_url: string): Promise<FetchedUrlContent> => {
    console.warn('[Puppeteer] Not available in v2 environment — returning empty result');
    return { rawText: '', images: [] };
};
