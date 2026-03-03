/**
 * Threads Fetcher — Platform-specific fetcher for Threads posts
 *
 * Handles:
 * 1. Puppeteer extraction (author handle, author-only chain, embedded links)
 * 2. Jina Reader supplement for comments (preserves Puppeteer body)
 * 3. Threads normalization with bug fixes:
 *    - B1: cleanLine() no longer strips external hyperlinks
 *    - B2: Jina supplement appends comments instead of replacing body
 *    - Paragraph separation between author's sub-thread posts
 */

import { extractWithPuppeteer } from './puppeteer-extractor';
import { normalizeThreads } from './normalizers/threads';
import { validateUrl } from './url-validator';
import { ENABLE_THREADS_AUTHOR_ONLY_CHAIN } from './feature-flags';
import { fetchWithTimeout, extractImagesFromMarkdown, splitThreadsSections, buildThreadsSections, selectBetterText } from './utils';
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

        const data = await response.json() as { data?: { content?: string }; content?: string };
        const rawContent = data.data?.content || data.content || '';

        if (!rawContent || rawContent.length < 20) {
            return { rawText: '', images: [] };
        }

        const images = extractImagesFromMarkdown(rawContent);

        const cleaned = normalizeThreads(rawContent, {
            authorHandle,
            authorOnlyChain: ENABLE_THREADS_AUTHOR_ONLY_CHAIN
        });

        return { rawText: cleaned, images };
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
// MAIN FETCHER
// ============================================================================

export class ThreadsFetcher implements PlatformFetcher {
    async fetch(url: string, options?: PlatformFetcherOptions): Promise<FetchedUrlContent> {
        const urlValidation = validateUrl(url);
        if (!urlValidation.valid) {
            console.error(`[Threads Fetcher] SSRF blocked: ${urlValidation.error}`);
            return { rawText: '', images: [] };
        }

        // Extract author from URL as baseline metadata
        const urlAuthor = extractAuthorFromThreadsUrl(url);

        // ── OAuth API path (when token available) ──
        if (options?.oauthToken) {
            try {
                const apiResult = await extractWithThreadsAPI(url, options.oauthToken);
                if (apiResult && apiResult.rawText) {
                    // Ensure author metadata
                    if (!apiResult.authorHandle && urlAuthor) {
                        apiResult.authorHandle = `@${urlAuthor}`;
                        apiResult.author = apiResult.author || urlAuthor;
                    }
                    return apiResult;
                }
                // API returned null (post not found / not owned) — fall through to Jina
            } catch (apiErr) {
                console.warn('[Threads Fetcher] API extraction failed, falling back:', apiErr);
            }
        }

        try {
            // Step 1: Puppeteer extraction (primary)
            const puppeteerResult = await extractWithPuppeteer(url);

            // Ensure author metadata from URL is always present
            if (!puppeteerResult.authorHandle && urlAuthor) {
                puppeteerResult.authorHandle = `@${urlAuthor}`;
                puppeteerResult.author = puppeteerResult.author || urlAuthor;
            }

            // Step 2: Check if result is usable
            const textLower = (puppeteerResult.rawText || '').toLowerCase();
            const hasLoginGate = textLower.includes('log in') || textLower.includes('sign up') ||
                textLower.includes('로그인') || textLower.includes('가입');

            const isWeak = !puppeteerResult.rawText ||
                puppeteerResult.rawText.length < 200 ||
                hasLoginGate;

            if (!isWeak) {
                return this.handleStrongPuppeteerResult(url, puppeteerResult);
            }

            console.warn(`[Threads Fetcher] Weak Puppeteer: ${puppeteerResult.rawText.length} chars, loginGate: ${hasLoginGate}`);
            return this.handleWeakPuppeteerResult(url, puppeteerResult);

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

    /**
     * Puppeteer succeeded — check if we need Jina to supplement comments
     * BUG FIX B2: Jina now appends comments instead of replacing body
     */
    private async handleStrongPuppeteerResult(
        url: string,
        puppeteerResult: FetchedUrlContent
    ): Promise<FetchedUrlContent> {
        const hasComments = puppeteerResult.rawText.includes('Comments(') ||
            puppeteerResult.rawText.includes('[[[COMMENTS_SECTION]]]');

        if (hasComments) {
            return applyThreadsNormalization(puppeteerResult);
        }

        let jinaUrl = url;
        if (url.includes('threads.com')) {
            jinaUrl = url.replace('threads.com', 'threads.net');
        }
        const authorHandle = puppeteerResult.authorHandle || '';
        const jinaSupplement = await extractWithJina(jinaUrl, authorHandle);

        const jinaHasComments = jinaSupplement.rawText &&
            (jinaSupplement.rawText.includes('Comments(') ||
             jinaSupplement.rawText.includes('[[[COMMENTS_SECTION]]]') ||
             jinaSupplement.rawText.length > puppeteerResult.rawText.length + 100);

        if (jinaHasComments && jinaSupplement.rawText) {
            const normalizedPuppeteer = applyThreadsNormalization(puppeteerResult);
            const puppeteerSections = splitThreadsSections(normalizedPuppeteer.rawText);
            const jinaSections = splitThreadsSections(jinaSupplement.rawText);

            const mergedBody = puppeteerSections.body || jinaSections.body;
            const mergedComments = jinaSections.comments.length > puppeteerSections.comments.length
                ? jinaSections.comments
                : puppeteerSections.comments;

            const mergedText = buildThreadsSections(mergedBody, mergedComments);

            return {
                ...normalizedPuppeteer,
                rawText: mergedText,
                rawTextOriginal: puppeteerResult.rawText,
                embeddedLinks: puppeteerResult.embeddedLinks
            };
        }

        return applyThreadsNormalization(puppeteerResult);
    }

    /**
     * Puppeteer was weak — use Jina as primary with Puppeteer metadata
     */
    private async handleWeakPuppeteerResult(
        url: string,
        puppeteerResult: FetchedUrlContent
    ): Promise<FetchedUrlContent> {
        let jinaUrl = url;
        if (url.includes('threads.com')) {
            jinaUrl = url.replace('threads.com', 'threads.net');
        }

        const authorHandle = puppeteerResult.authorHandle || '';
        const jinaResult = await extractWithJina(jinaUrl, authorHandle);

        if (jinaResult.rawText && jinaResult.rawText.length > 50) {
            const jinaTextLower = jinaResult.rawText.toLowerCase();
            const authorLower = authorHandle.toLowerCase();

            const hasUnrelatedContent = authorLower &&
                !jinaTextLower.includes(authorLower) &&
                (jinaTextLower.includes('fifa') || jinaTextLower.includes('world cup') ||
                 jinaTextLower.includes('champions') || jinaTextLower.includes('trending') ||
                 jinaTextLower.includes('for you'));

            if (hasUnrelatedContent) {
                console.warn('[Threads Fetcher] Jina returned unrelated content, discarding');
                return applyThreadsNormalization({
                    ...puppeteerResult,
                    rawText: '',
                });
            }

            if (ENABLE_THREADS_AUTHOR_ONLY_CHAIN) {
                const normalizedPuppeteer = applyThreadsNormalization({
                    ...puppeteerResult,
                    authorHandle: authorHandle || puppeteerResult.authorHandle
                });

                const puppeteerSections = splitThreadsSections(normalizedPuppeteer.rawText);
                const jinaSections = splitThreadsSections(jinaResult.rawText);
                const mergedBody = selectBetterText(puppeteerSections.body, jinaSections.body);
                const mergedText = buildThreadsSections(mergedBody, puppeteerSections.comments);

                return {
                    ...normalizedPuppeteer,
                    rawText: mergedText,
                    rawTextOriginal: jinaResult.rawText || normalizedPuppeteer.rawTextOriginal,
                    embeddedLinks: puppeteerResult.embeddedLinks || jinaResult.embeddedLinks
                };
            }

            const merged: FetchedUrlContent = {
                rawText: jinaResult.rawText,
                htmlContent: jinaResult.htmlContent || puppeteerResult.htmlContent,
                images: puppeteerResult.images.length > 0 ? puppeteerResult.images : jinaResult.images,
                author: puppeteerResult.author || jinaResult.author,
                authorAvatar: puppeteerResult.authorAvatar || jinaResult.authorAvatar,
                authorHandle: puppeteerResult.authorHandle || jinaResult.authorHandle,
                finalUrl: jinaUrl,
                embeddedLinks: puppeteerResult.embeddedLinks
            };
            return applyThreadsNormalization(merged);
        }

        console.warn('[Threads Fetcher] Both Puppeteer and Jina failed');
        return applyThreadsNormalization(puppeteerResult);
    }
}
