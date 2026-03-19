/**
 * Instagram Fetcher — Pass-through fetcher for Instagram posts
 *
 * Instagram extraction is handled by Puppeteer.
 * This fetcher delegates to Puppeteer without modifications.
 */

// Puppeteer not available in serverless v2 — import removed
import { validateUrl } from './url-validator';
import type { FetchedUrlContent, PlatformFetcher } from './types';

export class InstagramFetcher implements PlatformFetcher {
    async fetch(url: string): Promise<FetchedUrlContent> {
        const urlValidation = validateUrl(url);
        if (!urlValidation.valid) {
            console.error(`[Instagram Fetcher] SSRF blocked: ${urlValidation.error}`);
            return { rawText: '', images: [] };
        }

        try {
            // Puppeteer not available in serverless — return empty so orchestrator falls back to OG meta
            console.warn('[Instagram Fetcher] Puppeteer unavailable in v2 — falling back to metadata');
            return { rawText: '', images: [] } as FetchedUrlContent;
        } catch (error) {
            console.error('[Instagram Fetcher] Error:', error);
            return { rawText: '', images: [] };
        }
    }
}
