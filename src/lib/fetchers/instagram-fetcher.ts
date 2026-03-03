/**
 * Instagram Fetcher — Pass-through fetcher for Instagram posts
 *
 * Instagram extraction is handled by Puppeteer.
 * This fetcher delegates to Puppeteer without modifications.
 */

import { extractWithPuppeteer } from './puppeteer-extractor';
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
            const result = await extractWithPuppeteer(url);

            if (!result.rawText || result.rawText.length < 50) {
                console.warn(`[Instagram Fetcher] Weak result: ${result.rawText?.length || 0} chars`);
            }

            return result;
        } catch (error) {
            console.error('[Instagram Fetcher] Error:', error);
            return { rawText: '', images: [] };
        }
    }
}
