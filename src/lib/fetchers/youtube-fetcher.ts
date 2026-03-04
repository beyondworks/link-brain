/**
 * YouTube Fetcher — Platform-specific fetcher for YouTube videos
 *
 * Strategy chain:
 * 1. YouTube Data API v3 + transcript (best quality)
 * 2. Jina Reader fallback
 * 3. oEmbed fallback (basic metadata)
 * 4. Puppeteer last resort
 */

import { extractYouTubeContent, buildYouTubeRichText } from './youtube-extractor';
import { extractWithPuppeteer } from './puppeteer-extractor';
import { validateUrl } from './url-validator';
import { fetchWithTimeout, extractImagesFromMarkdown } from './utils';
import type { FetchedUrlContent, PlatformFetcher } from './types';

/**
 * Fetch YouTube video metadata via oEmbed API
 */
const fetchYouTubeOEmbed = async (url: string): Promise<FetchedUrlContent> => {
    try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const response = await fetchWithTimeout(oembedUrl, {}, 10000);

        if (!response.ok) {
            console.warn(`[YouTube Fetcher/oEmbed] API returned ${response.status}`);
            return { rawText: '', images: [] };
        }

        const data = await response.json() as {
            title?: string;
            author_name?: string;
            thumbnail_url?: string;
        };
        const title = data.title || '';
        const author = data.author_name || '';
        const thumbnailUrl = data.thumbnail_url || '';

        const textParts: string[] = [];
        if (title) textParts.push(title);
        if (author) textParts.push(`Channel: ${author}`);

        return {
            rawText: textParts.join('\n\n'),
            images: thumbnailUrl ? [thumbnailUrl] : [],
            author,
            authorHandle: author
        };
    } catch (error) {
        console.error('[YouTube Fetcher/oEmbed] Error:', error);
        return { rawText: '', images: [] };
    }
};

/**
 * Clean YouTube page text — removes UI chrome, recommended videos, and other noise
 */
const cleanYouTubePageText = (raw: string): string => {
    let cleaned = raw;

    // Remove markdown images and bare links
    cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    cleaned = cleaned.replace(/\[]\([^)]+\)/g, '');
    cleaned = cleaned.replace(/^https?:\/\/[^\s]+$/gm, '');
    cleaned = cleaned.replace(/^\d+\s*$/gm, '');

    // Remove YouTube page navigation & UI elements
    cleaned = cleaned.replace(/^(Skip navigation|Search with your voice|Search|Back|Sign in.*|Subscribed|YouTube Home)\s*$/gim, '');
    cleaned = cleaned.replace(/^(구독|Subscribe|좋아요|Like|싫어요|Dislike|공유|Share|저장|Save|더보기|Show more|간략히|Show less|댓글|Comments?|정렬 기준|Sort by|Transcript|Show transcript|Follow along using the transcript\.?|\.\.\.more|감사합니다|Thanks|클립|Clip|오프라인 저장|Download|신고|Report|자세히|Learn more)\s*$/gim, '');
    cleaned = cleaned.replace(/^Channel:\s+.+$/gm, '');
    // Remove subscriber counts, view counts, and relative timestamps
    cleaned = cleaned.replace(/^[\d,.]+[KMB]?\s*(subscribers?|구독자)\s*$/gim, '');
    cleaned = cleaned.replace(/\d[\d,.]*\s*(회|views?|조회수)[^\n]*/gi, '');
    cleaned = cleaned.replace(/\d+\s*(시간|분|일|주|개월|년|hours?|minutes?|days?|weeks?|months?|years?)\s*(전|ago)/gi, '');
    // Remove Sign in prompts and bot check messages
    cleaned = cleaned.replace(/^Sign in to confirm.*$/gim, '');
    cleaned = cleaned.replace(/^\[Sign in\].*$/gm, '');
    cleaned = cleaned.replace(/^\[Learn more\].*$/gm, '');
    // Remove markdown links to youtu.be / youtube.com
    cleaned = cleaned.replace(/\[[^\]]*\]\(https?:\/\/(www\.)?(youtu\.be|youtube\.com)[^)]*\)\s*/g, '');

    // Remove short non-content lines (likely UI labels)
    cleaned = cleaned.replace(/(^.{1,80}\n){2,4}/gm, (block: string) => {
        const lines = block.split('\n').filter(Boolean);
        const looksLikeContent = lines.some((l: string) => l.length > 80 || /[.,!?]/.test(l));
        return looksLikeContent ? block : '';
    });

    cleaned = cleaned.replace(/^(댓글\s*\d*|[Cc]omments?\s*\d*)\s*$/gm, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    return cleaned;
};

/**
 * Extract content using Jina Reader API (YouTube-specific)
 */
const extractWithJina = async (url: string): Promise<FetchedUrlContent> => {
    try {
        const jinaUrl = `https://r.jina.ai/${url}`;
        const jinaApiKey = process.env.JINA_API_KEY;

        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (jinaApiKey) headers['Authorization'] = `Bearer ${jinaApiKey}`;

        const response = await fetchWithTimeout(jinaUrl, { headers }, 20000);

        if (!response.ok) {
            console.warn(`[YouTube Fetcher/Jina] API returned ${response.status}`);
            return { rawText: '', images: [] };
        }

        const data = await response.json() as { data?: { content?: string }; content?: string };
        const rawContent = data.data?.content || data.content || '';

        if (!rawContent || rawContent.length < 20) {
            return { rawText: '', images: [] };
        }

        const images = extractImagesFromMarkdown(rawContent);
        const cleaned = cleanYouTubePageText(rawContent);

        // Discard if cleaned content is too short (likely just UI noise)
        if (cleaned.length < 50) {
            return { rawText: '', images };
        }

        return { rawText: cleaned, images };
    } catch (error) {
        console.error('[YouTube Fetcher/Jina] Error:', error);
        return { rawText: '', images: [] };
    }
};

// ============================================================================
// MAIN FETCHER
// ============================================================================

export class YouTubeFetcher implements PlatformFetcher {
    async fetch(url: string): Promise<FetchedUrlContent> {
        const urlValidation = validateUrl(url);
        if (!urlValidation.valid) {
            console.error(`[YouTube Fetcher] SSRF blocked: ${urlValidation.error}`);
            return { rawText: '', images: [] };
        }

        try {
            // Strategy 1: YouTube Data API v3 + transcript (best quality)
            const ytData = await extractYouTubeContent(url);

            if (ytData && ytData.hasTranscript) {
                const richText = buildYouTubeRichText(ytData);
                return {
                    rawText: richText,
                    images: ytData.thumbnailUrl ? [ytData.thumbnailUrl] : [],
                    author: ytData.channelTitle,
                    authorHandle: ytData.channelTitle,
                    finalUrl: url
                };
            }

            // Strategy 2: No transcript — try Jina to supplement with page description
            const jinaResult = await extractWithJina(url);

            if (ytData && jinaResult.rawText && jinaResult.rawText.length > 100) {
                const enriched = { ...ytData, description: jinaResult.rawText };
                const richText = buildYouTubeRichText(enriched);
                return {
                    rawText: richText,
                    images: ytData.thumbnailUrl ? [ytData.thumbnailUrl] : jinaResult.images,
                    author: ytData.channelTitle || jinaResult.author || '',
                    authorHandle: ytData.channelTitle || jinaResult.authorHandle || '',
                    finalUrl: url
                };
            }

            // Strategy 3: Puppeteer
            const puppeteerResult = await extractWithPuppeteer(url);

            if (ytData && puppeteerResult.rawText && puppeteerResult.rawText.length > 100) {
                const cleanedPuppeteer = cleanYouTubePageText(puppeteerResult.rawText);
                const enriched = { ...ytData, description: cleanedPuppeteer };
                const richText = buildYouTubeRichText(enriched);
                return {
                    rawText: richText,
                    images: ytData.thumbnailUrl ? [ytData.thumbnailUrl] : puppeteerResult.images,
                    author: ytData.channelTitle || puppeteerResult.author || '',
                    authorHandle: ytData.channelTitle || puppeteerResult.authorHandle || '',
                    finalUrl: url
                };
            }

            if (ytData) {
                const richText = buildYouTubeRichText(ytData);
                return {
                    rawText: richText,
                    images: ytData.thumbnailUrl ? [ytData.thumbnailUrl] : [],
                    author: ytData.channelTitle,
                    authorHandle: ytData.channelTitle,
                    finalUrl: url
                };
            }

            if (jinaResult.rawText && jinaResult.rawText.length > 100) {
                return jinaResult;
            }

            if (puppeteerResult.rawText && puppeteerResult.rawText.length > 30) {
                return puppeteerResult;
            }

            // Strategy 4: Standalone oEmbed (last resort)
            const oembedResult = await fetchYouTubeOEmbed(url);
            return oembedResult.rawText ? oembedResult : { rawText: '', images: [] };

        } catch (error) {
            console.error('[YouTube Fetcher] Error:', error);
            return { rawText: '', images: [] };
        }
    }
}
