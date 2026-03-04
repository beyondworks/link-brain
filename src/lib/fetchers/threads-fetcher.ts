/**
 * Threads Fetcher — Platform-specific fetcher for Threads posts
 *
 * Handles:
 * 1. OAuth API extraction (own posts, when token available)
 * 2. Jina Reader as primary extractor (other users' posts)
 * 3. HTML fallback for carousel image extraction
 * 4. Threads normalization with comment detection
 */

import { normalizeThreads } from './normalizers/threads';
import { validateUrl } from './url-validator';
import { ENABLE_THREADS_AUTHOR_ONLY_CHAIN } from './feature-flags';
import { fetchWithTimeout, extractImagesFromMarkdown, extractImagesFromHtml } from './utils';
import { extractWithThreadsAPI } from '@/lib/oauth/threads-api';
import type { FetchedUrlContent, PlatformFetcher, PlatformFetcherOptions } from './types';

/**
 * Apply Threads-specific text normalization
 */
const applyThreadsNormalization = (content: FetchedUrlContent): FetchedUrlContent => {
    const original = content.rawText || '';
    const normalized = normalizeThreads(original, {
        authorHandle: content.authorHandle,
        authorOnlyChain: ENABLE_THREADS_AUTHOR_ONLY_CHAIN
    });
    return {
        ...content,
        rawText: normalized,
        rawTextOriginal: original
    };
};

// ============================================================================
// JINA READER (lightweight, Threads-specific)
// ============================================================================

interface JinaData {
    title?: string;
    description?: string;
    content?: string;
    html?: string;
    url?: string;
    images?: Array<string | { src?: string; url?: string; alt?: string }>;
}

const extractWithJina = async (url: string, authorHandle: string = ''): Promise<FetchedUrlContent> => {
    try {
        const jinaUrl = `https://r.jina.ai/${url}`;
        const jinaApiKey = process.env.JINA_API_KEY;

        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (jinaApiKey) headers['Authorization'] = `Bearer ${jinaApiKey}`;

        const response = await fetchWithTimeout(jinaUrl, { headers }, 20000);
        if (!response.ok) {
            console.warn(`[Threads Fetcher/Jina] API returned ${response.status}`);
            return { rawText: '', images: [] };
        }

        const json = await response.json() as { data?: JinaData; content?: string };
        const structured = (json.data ?? json) as JinaData;
        const rawContent = structured.content || '';

        if (!rawContent || rawContent.length < 20) {
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

        const cleaned = normalizeThreads(rawContent, {
            authorHandle,
            authorOnlyChain: ENABLE_THREADS_AUTHOR_ONLY_CHAIN
        });

        return { rawText: cleaned, images, title: structured.title };
    } catch (error) {
        console.error('[Threads Fetcher/Jina] Error:', error);
        return { rawText: '', images: [] };
    }
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract author handle from Threads URL pattern.
 * e.g. https://www.threads.net/@username/post/xxx → username
 */
const extractAuthorFromThreadsUrl = (url: string): string => {
    try {
        const pathname = new URL(url).pathname;
        const match = pathname.match(/^\/@?([^/]+)/);
        return match ? match[1] : '';
    } catch {
        return '';
    }
};

// ============================================================================
// HTML IMAGE FALLBACK
// ============================================================================

/**
 * When Jina returns 0-1 images, fetch HTML directly and extract scontent CDN URLs.
 * This recovers carousel images that OG tags miss.
 */
const extractThreadsImagesFromHtml = async (url: string): Promise<string[]> => {
    try {
        const res = await fetchWithTimeout(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Accept': 'text/html',
            },
        }, 8000);
        if (!res.ok) return [];

        const html = await res.text();
        return extractImagesFromHtml(html);
    } catch {
        return [];
    }
};

// ============================================================================
// MAIN FETCHER
// ============================================================================

export class ThreadsFetcher implements PlatformFetcher {
    async fetch(url: string, options?: PlatformFetcherOptions): Promise<FetchedUrlContent> {
        const urlValidation = validateUrl(url);
        if (!urlValidation.valid) {
            console.error(`[Threads Fetcher] SSRF blocked: ${urlValidation.error}`);
            return { rawText: '', images: [] };
        }

        const urlAuthor = extractAuthorFromThreadsUrl(url);

        // ── OAuth API path (when token available) ──
        if (options?.oauthToken) {
            try {
                const apiResult = await extractWithThreadsAPI(url, options.oauthToken);
                if (apiResult && apiResult.rawText) {
                    if (!apiResult.authorHandle && urlAuthor) {
                        apiResult.authorHandle = `@${urlAuthor}`;
                        apiResult.author = apiResult.author || urlAuthor;
                    }
                    return apiResult;
                }
            } catch (apiErr) {
                console.warn('[Threads Fetcher] API extraction failed, falling back:', apiErr);
            }
        }

        // ── Jina Reader path (primary for non-owned posts) ──
        try {
            let jinaUrl = url;
            if (url.includes('threads.com')) {
                jinaUrl = url.replace('threads.com', 'threads.net');
            }

            const jinaResult = await extractWithJina(jinaUrl, urlAuthor);

            if (!jinaResult.rawText || jinaResult.rawText.length < 50) {
                console.warn('[Threads Fetcher] Jina returned insufficient content');
                return {
                    rawText: '',
                    images: [],
                    author: urlAuthor,
                    authorHandle: urlAuthor ? `@${urlAuthor}` : undefined,
                };
            }

            // Discard unrelated content (Jina sometimes returns trending/feed)
            const jinaTextLower = jinaResult.rawText.toLowerCase();
            const authorLower = urlAuthor.toLowerCase();
            if (authorLower &&
                !jinaTextLower.includes(authorLower) &&
                (jinaTextLower.includes('trending') || jinaTextLower.includes('for you'))) {
                console.warn('[Threads Fetcher] Jina returned unrelated content, discarding');
                return {
                    rawText: '',
                    images: [],
                    author: urlAuthor,
                    authorHandle: urlAuthor ? `@${urlAuthor}` : undefined,
                };
            }

            // Image enhancement: if Jina got <= 1 image, try HTML extraction
            if (jinaResult.images.length <= 1) {
                const htmlImages = await extractThreadsImagesFromHtml(jinaUrl);
                if (htmlImages.length > jinaResult.images.length) {
                    jinaResult.images = htmlImages;
                }
            }

            // Ensure author metadata
            if (!jinaResult.authorHandle && urlAuthor) {
                jinaResult.authorHandle = `@${urlAuthor}`;
            }
            if (!jinaResult.author && urlAuthor) {
                jinaResult.author = urlAuthor;
            }

            return applyThreadsNormalization(jinaResult);
        } catch (error) {
            console.error('[Threads Fetcher] Error:', error);
            return {
                rawText: '',
                images: [],
                author: urlAuthor,
                authorHandle: urlAuthor ? `@${urlAuthor}` : undefined,
            };
        }
    }
}
