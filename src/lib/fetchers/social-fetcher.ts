/**
 * Social Media Fetcher — Puppeteer pass-through for social platforms
 *
 * Used for Twitter/X and Pinterest where Puppeteer extraction
 * is the primary strategy (same as Instagram).
 */

// Puppeteer not available in serverless v2 — import removed
import { validateUrl } from './url-validator';
import type { FetchedUrlContent, PlatformFetcher } from './types';

export class SocialFetcher implements PlatformFetcher {
    async fetch(url: string): Promise<FetchedUrlContent> {
        const urlValidation = validateUrl(url);
        if (!urlValidation.valid) {
            console.error(`[Social Fetcher] SSRF blocked: ${urlValidation.error}`);
            return { rawText: '', images: [] };
        }

        try {
            // Puppeteer not available in serverless — return empty so orchestrator falls back to OG meta
            console.warn('[Social Fetcher] Puppeteer unavailable in v2 — falling back to metadata');
            return { rawText: '', images: [] } as FetchedUrlContent;
        } catch (error) {
            console.error('[Social Fetcher] Error:', error);
            return { rawText: '', images: [] };
        }
    }
}
