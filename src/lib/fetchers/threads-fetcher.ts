/**
 * Threads Fetcher — tiered escalation for Threads posts.
 *
 * Chain: OAuth Graph API (own posts, when token available) → Jina Reader
 * (with HTML carousel-image enhancement + Threads normalization) → OG-meta.
 */

import { normalizeThreads } from './normalizers/threads';
import { ENABLE_THREADS_AUTHOR_ONLY_CHAIN } from './feature-flags';
import { fetchWithTimeout, extractImagesFromHtml } from './utils';
import { extractWithThreadsAPI } from '@/lib/oauth/threads-api';
import { runEscalationChain, type FetchStep, type StepOutcome } from './escalation';
import { GOOGLEBOT_UA, runJinaStep, runOgMetaStep } from './step-helpers';
import type { FetchResult } from './fetch-result';
import type { FetchedUrlContent, PlatformFetcher, PlatformFetcherOptions } from './types';

/** Apply Threads-specific text normalization (SINGLE PASS). */
const applyThreadsNormalization = (content: FetchedUrlContent): FetchedUrlContent => {
    const original = content.rawText || '';
    const normalized = normalizeThreads(original, {
        authorHandle: content.authorHandle,
        authorOnlyChain: ENABLE_THREADS_AUTHOR_ONLY_CHAIN,
    });
    return { ...content, rawText: normalized, rawTextOriginal: original };
};

/** Extract author handle from a Threads URL: /@username/post/xxx → username. */
const extractAuthorFromThreadsUrl = (url: string): string => {
    try {
        const match = new URL(url).pathname.match(/^\/@?([^/]+)/);
        return match ? match[1] : '';
    } catch {
        return '';
    }
};

/** Recover carousel images that OG tags miss by scraping scontent CDN URLs. */
const extractThreadsImagesFromHtml = async (url: string): Promise<string[]> => {
    try {
        const res = await fetchWithTimeout(
            url,
            { headers: { 'User-Agent': GOOGLEBOT_UA, Accept: 'text/html' } },
            8000,
        );
        if (!res.ok) return [];
        return extractImagesFromHtml(await res.text());
    } catch {
        return [];
    }
};

const runOAuthStep = async (url: string, token: string, urlAuthor: string): Promise<StepOutcome> => {
    const apiResult = await extractWithThreadsAPI(url, token);
    if (!apiResult || !apiResult.rawText) return { verdict: 'empty' };

    if (!apiResult.authorHandle && urlAuthor) {
        apiResult.authorHandle = `@${urlAuthor}`;
        apiResult.author = apiResult.author || urlAuthor;
    }
    return { verdict: 'ok', content: apiResult };
};

const runThreadsJinaStep = async (url: string, urlAuthor: string): Promise<StepOutcome> => {
    // threads.com posts render better through the threads.net host on Jina.
    const jinaUrl = url.includes('threads.com') ? url.replace('threads.com', 'threads.net') : url;
    const outcome = await runJinaStep(jinaUrl);
    if (!outcome.content) {
        return {
            verdict: outcome.verdict === 'ok' ? 'empty' : outcome.verdict,
            detail: outcome.detail,
        };
    }

    const content = outcome.content;

    // Discard unrelated feed/trending content Jina sometimes returns.
    const textLower = content.rawText.toLowerCase();
    const authorLower = urlAuthor.toLowerCase();
    if (authorLower && !textLower.includes(authorLower) &&
        (textLower.includes('trending') || textLower.includes('for you'))) {
        return { verdict: 'empty' };
    }

    // Enhance images from HTML when Jina returned 0-1.
    if (content.images.length <= 1) {
        const htmlImages = await extractThreadsImagesFromHtml(jinaUrl);
        if (htmlImages.length > content.images.length) content.images = htmlImages;
    }

    if (!content.authorHandle && urlAuthor) content.authorHandle = `@${urlAuthor}`;
    if (!content.author && urlAuthor) content.author = urlAuthor;

    const normalized = applyThreadsNormalization(content);
    return { verdict: outcome.verdict, content: normalized };
};

export class ThreadsFetcher implements PlatformFetcher {
    async fetch(url: string, options?: PlatformFetcherOptions): Promise<FetchResult> {
        const urlAuthor = extractAuthorFromThreadsUrl(url);
        const steps: FetchStep[] = [];

        if (options?.oauthToken) {
            const token = options.oauthToken;
            steps.push({ method: 'threads:oauth', tier: 'api', run: () => runOAuthStep(url, token, urlAuthor) });
        }

        steps.push({ method: 'jina', tier: 'reader', run: () => runThreadsJinaStep(url, urlAuthor) });
        steps.push({ method: 'og-meta', tier: 'html', run: () => runOgMetaStep(url) });

        return runEscalationChain(steps);
    }
}
