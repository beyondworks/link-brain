/**
 * Naver Blog Fetcher — Platform-specific fetcher for Naver Blog
 *
 * Handles:
 * 1. Mobile URL conversion (desktop -> mobile for no-iframe extraction)
 * 2. Jina Reader primary extraction
 * 3. Puppeteer fallback
 * 4. Naver-specific normalization
 */

import { normalizeNaverBlog } from './normalizers/naver';
import { extractWithPuppeteer } from './puppeteer-extractor';
import { validateUrl } from './url-validator';
import { fetchWithTimeout, extractImagesFromMarkdown } from './utils';
import type { FetchedUrlContent, PlatformFetcher } from './types';

/**
 * Convert Naver Blog URL to mobile version for better extraction
 * Mobile version doesn't use iframes
 */
const convertToNaverMobile = (url: string): string => {
    if (url.includes('m.blog.naver.com')) {
        return url;
    }
    return url.replace('blog.naver.com', 'm.blog.naver.com');
};

/**
 * Extract content using Jina Reader API (Naver-specific)
 */
const extractWithJina = async (url: string): Promise<FetchedUrlContent> => {
    try {
        const jinaUrl = `https://r.jina.ai/${url}`;
        const jinaApiKey = process.env.JINA_API_KEY;

        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (jinaApiKey) headers['Authorization'] = `Bearer ${jinaApiKey}`;

        const response = await fetchWithTimeout(jinaUrl, { headers }, 20000);

        if (!response.ok) {
            console.warn(`[Naver Fetcher/Jina] API returned ${response.status}`);
            return { rawText: '', images: [] };
        }

        const data = await response.json() as { data?: { content?: string }; content?: string };
        const rawContent = data.data?.content || data.content || '';

        if (!rawContent || rawContent.length < 20) {
            return { rawText: '', images: [] };
        }

        const images = extractImagesFromMarkdown(rawContent);

        return { rawText: rawContent, images };
    } catch (error) {
        console.error('[Naver Fetcher/Jina] Error:', error);
        return { rawText: '', images: [] };
    }
};

// ============================================================================
// MAIN FETCHER
// ============================================================================

export class NaverFetcher implements PlatformFetcher {
    async fetch(url: string): Promise<FetchedUrlContent> {
        const urlValidation = validateUrl(url);
        if (!urlValidation.valid) {
            console.error(`[Naver Fetcher] SSRF blocked: ${urlValidation.error}`);
            return { rawText: '', images: [] };
        }

        try {
            const mobileUrl = convertToNaverMobile(url);

            // Strategy 1: Jina Reader with mobile URL
            const jinaResult = await extractWithJina(mobileUrl);

            if (jinaResult.rawText && jinaResult.rawText.length > 50) {
                const normalizedText = normalizeNaverBlog(jinaResult.rawText);
                return {
                    ...jinaResult,
                    rawText: normalizedText,
                    finalUrl: url
                };
            }

            // Strategy 2: Puppeteer fallback
            console.warn('[Naver Fetcher] Jina weak, trying Puppeteer');
            const puppeteerResult = await extractWithPuppeteer(mobileUrl);
            if (puppeteerResult.rawText && puppeteerResult.rawText.length > 50) {
                const normalizedText = normalizeNaverBlog(puppeteerResult.rawText);
                return {
                    ...puppeteerResult,
                    rawText: normalizedText,
                    finalUrl: url
                };
            }

            // Both failed — return best available
            console.warn('[Naver Fetcher] Both extraction methods weak');
            return {
                ...jinaResult,
                rawText: normalizeNaverBlog(jinaResult.rawText || ''),
                finalUrl: url
            };

        } catch (error) {
            console.error('[Naver Fetcher] Error:', error);
            return { rawText: '', images: [] };
        }
    }
}
