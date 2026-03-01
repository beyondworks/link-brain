/**
 * Social Media Fetcher — Puppeteer pass-through for social platforms
 *
 * Used for Twitter/X and Pinterest where Puppeteer extraction
 * is the primary strategy (same as Instagram).
 */

import { extractWithPuppeteer } from './puppeteer-extractor';
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
            console.log(`[Social Fetcher] Using Puppeteer for: ${url}`);
            const result = await extractWithPuppeteer(url);

            if (!result.rawText || result.rawText.length < 50) {
                console.warn(`[Social Fetcher] Weak result: ${result.rawText?.length || 0} chars`);
            }

            return result;
        } catch (error) {
            console.error('[Social Fetcher] Error:', error);
            return { rawText: '', images: [] };
        }
    }
}
