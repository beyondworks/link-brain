/**
 * Web Fetcher — Platform-specific fetcher for general web content
 *
 * Handles:
 * 1. Jina Reader primary extraction
 * 2. Puppeteer fallback for weak results
 * 3. Web normalization with bug fixes:
 *    - B3: Single normalization pass (was applied 3x on merge path)
 *    - B4: Footer detection no longer resets after detection
 */

import { normalizeWeb } from './normalizers/web';
import { extractWithPuppeteer } from './puppeteer-extractor';
import { validateUrl } from './url-validator';
import { ENABLE_WEB_FALLBACK_MERGE } from './feature-flags';
import { fetchWithTimeout, extractImagesFromMarkdown, hasAuthGate, selectBetterText } from './utils';
import type { FetchedUrlContent, PlatformFetcher } from './types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const isWeakWebResult = (content: FetchedUrlContent): boolean => {
    const text = content.rawText || '';
    return !text ||
        text.length < 280 ||
        hasAuthGate(text);
};

/**
 * Apply Web-specific text normalization (SINGLE PASS)
 * Falls back to original text if normalization loses too much content.
 */
const applyWebNormalization = (content: FetchedUrlContent): FetchedUrlContent => {
    const original = content.rawText || '';
    if (!original || original.length < 50) {
        return content;
    }

    const normalized = normalizeWeb(original);

    const lossRate = 1 - (normalized.length / original.length);
    const tooAggressive = normalized.length < 100 || lossRate > 0.7;

    const effectiveText = tooAggressive ? original : normalized;

    return {
        ...content,
        rawText: effectiveText,
        rawTextOriginal: original
    };
};

/**
 * Clean markdown content from Jina Reader for web content
 */
const cleanJinaWebContent = (content: string): string => {
    if (!content) return '';

    let cleaned = content;

    cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    cleaned = cleaned.replace(/\[?Image\s*\d*:?\s*[^\]]*\]?\([^)]+\)/gi, '');
    cleaned = cleaned.replace(/\[Image\s*\d+:.*?\]/gi, '');
    cleaned = cleaned.replace(/^https?:\/\/[^\s]+$/gm, '');
    cleaned = cleaned.replace(/^\d+\s*$/gm, '');
    cleaned = cleaned.replace(/^\d+[KkMm]?\s*(likes?|views?|reposts?|replies?|comments?)?\s*$/gim, '');

    const uiPatterns = [
        /^Translate$/gim,
        /^-Author$/gim,
        /^Author$/gim,
        /^View all \d+ replies?$/gim,
        /^Show more$/gim,
        /^Hide$/gim,
        /^Share$/gim,
        /^Reply$/gim,
        /^Repost$/gim,
        /^Quote$/gim,
        /^Like$/gim,
        /^Log in.*$/gim,
        /^Sign up.*$/gim,
        /^Create new account.*$/gim,
        /^Forgot password.*$/gim,
        /^Log in with Facebook$/gim,
        /^About.*Meta.*$/gim,
        /^\[Meta\].*$/gim,
        /^\[About\].*$/gim,
        /^\[Blog\].*$/gim,
        /^\[Jobs\].*$/gim,
        /^\[Help\].*$/gim,
        /^\* \* \*$/gm,
        /^• • •$/gm,
        /^Sorry, we're having trouble playing this video\.?$/gim,
    ];

    for (const pattern of uiPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    cleaned = cleaned.replace(/^[\s*\-•·|=_]+$/gm, '');
    cleaned = cleaned.replace(/\[\]\([^)]+\)/g, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/^\s+|\s+$/g, '');

    return cleaned.trim();
};

/**
 * Extract content using Jina Reader API (web-specific)
 */
interface JinaData {
    title?: string;
    description?: string;
    content?: string;
    html?: string;
    url?: string;
    images?: Array<string | { src?: string; url?: string; alt?: string }>;
    screenshotUrl?: string;
}

const extractWithJina = async (url: string): Promise<FetchedUrlContent> => {
    try {
        const jinaUrl = `https://r.jina.ai/${url}`;
        const jinaApiKey = process.env.JINA_API_KEY;

        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (jinaApiKey) headers['Authorization'] = `Bearer ${jinaApiKey}`;

        const response = await fetchWithTimeout(jinaUrl, { headers }, 20000);

        if (!response.ok) {
            console.warn(`[Web Fetcher/Jina] API returned ${response.status}`);
            return { rawText: '', images: [] };
        }

        const json = await response.json() as { data?: JinaData; content?: string; title?: string };
        const structured = (json.data ?? json) as JinaData;
        const rawContent = structured.content || '';

        if (!rawContent || rawContent.length < 20) {
            console.warn('[Web Fetcher/Jina] Insufficient content');
            return { rawText: '', images: [] };
        }

        // Extract images from markdown content
        const images = extractImagesFromMarkdown(rawContent);

        // Also extract from Jina structured image data
        if (structured.images && Array.isArray(structured.images)) {
            for (const img of structured.images) {
                const imgUrl = typeof img === 'string' ? img : (img.src || img.url || '');
                if (imgUrl && !images.includes(imgUrl)) images.push(imgUrl);
            }
        }
        if (structured.screenshotUrl && !images.includes(structured.screenshotUrl)) {
            images.push(structured.screenshotUrl);
        }

        const cleaned = cleanJinaWebContent(rawContent);

        return {
            rawText: cleaned,
            images,
            title: structured.title || undefined,
            description: structured.description || undefined,
            htmlContent: structured.html || undefined,
        };
    } catch (error) {
        console.error('[Web Fetcher/Jina] Error:', error);
        return { rawText: '', images: [] };
    }
};

// ============================================================================
// MAIN FETCHER
// ============================================================================

export class WebFetcher implements PlatformFetcher {
    async fetch(url: string): Promise<FetchedUrlContent> {
        const urlValidation = validateUrl(url);
        if (!urlValidation.valid) {
            console.error(`[Web Fetcher] SSRF blocked: ${urlValidation.error}`);
            return { rawText: '', images: [] };
        }

        try {
            // Step 1: Jina Reader (primary)
            const jinaResult = await extractWithJina(url);

            // Step 2: Normalize (SINGLE PASS — B3 fix)
            const normalizedJina = applyWebNormalization(jinaResult);

            // Step 3: Check if result is strong enough
            if (!ENABLE_WEB_FALLBACK_MERGE || !isWeakWebResult(normalizedJina)) {
                return normalizedJina;
            }

            // Step 4: Weak result — Puppeteer fallback merge
            console.warn(`[Web Fetcher] Weak Jina result (${normalizedJina.rawText.length} chars), trying Puppeteer fallback`);
            const puppeteerResult = await extractWithPuppeteer(url);

            // BUG FIX B3: Do NOT normalize individual sources then normalize again.
            const normalizedPuppeteer = applyWebNormalization(puppeteerResult);

            const mergedText = selectBetterText(normalizedJina.rawText, normalizedPuppeteer.rawText);
            const mergedImages = normalizedPuppeteer.images.length > 0
                ? normalizedPuppeteer.images
                : normalizedJina.images;

            const merged: FetchedUrlContent = {
                rawText: mergedText,
                htmlContent: normalizedJina.htmlContent || normalizedPuppeteer.htmlContent,
                images: mergedImages,
                author: normalizedJina.author || normalizedPuppeteer.author,
                authorAvatar: normalizedJina.authorAvatar || normalizedPuppeteer.authorAvatar,
                authorHandle: normalizedJina.authorHandle || normalizedPuppeteer.authorHandle,
                finalUrl: normalizedJina.finalUrl || normalizedPuppeteer.finalUrl || url,
                embeddedLinks: normalizedJina.embeddedLinks || normalizedPuppeteer.embeddedLinks
            };

            return merged;

        } catch (error) {
            console.error('[Web Fetcher] Error:', error);
            return { rawText: '', images: [] };
        }
    }
}
