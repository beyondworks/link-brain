/**
 * URL Content Orchestrator
 *
 * Routes URLs to platform-specific fetchers and returns a rich FetchResult.
 * `fetchUrlContentDetailed` is the primary entry (callers pattern-match on the
 * result kind); `fetchUrlContent` is a thin backward-compatible adapter.
 */

import { validateUrl } from './url-validator';
import { detectPlatform } from './platform-detector';
import { ThreadsFetcher } from './threads-fetcher';
import { YouTubeFetcher } from './youtube-fetcher';
import { NaverFetcher } from './naver-fetcher';
import { InstagramFetcher } from './instagram-fetcher';
import { TwitterFetcher } from './twitter-fetcher';
import { RedditFetcher } from './reddit-fetcher';
import { WebFetcher } from './web-fetcher';
import { fetchOgMeta } from './utils';
import {
    blockedResult,
    errorResult,
    weakResult,
    contentOf,
    type FetchResult,
} from './fetch-result';
import type { FetchedUrlContent, PlatformFetcher } from './types';

const FETCHER_MAP: Record<string, new () => PlatformFetcher> = {
    threads: ThreadsFetcher,
    youtube: YouTubeFetcher,
    naver: NaverFetcher,
    instagram: InstagramFetcher,
    twitter: TwitterFetcher,
    reddit: RedditFetcher,
    pinterest: WebFetcher,
    web: WebFetcher,
};

const isThinContent = (content: FetchedUrlContent): boolean =>
    !content.rawText || content.rawText.length < 100 || content.images.length === 0 || !content.title;

/** Merge missing OG title/description/image into existing content (in place). */
const fillMissingOgFields = async (content: FetchedUrlContent, url: string): Promise<void> => {
    try {
        const og = await fetchOgMeta(url);
        if (content.images.length === 0 && og.image) content.images = [og.image];
        if (!content.title && og.title) content.title = og.title;
        if (!content.description && og.description) content.description = og.description;
    } catch {
        // Non-fatal — keep what we have.
    }
};

/**
 * Fetch content from a URL and return the full tiered FetchResult.
 *
 * - SSRF-invalid URLs resolve to a non-retryable error.
 * - `empty` / `blocked`-with-null-content trigger an OG-meta rescue.
 * - Successful/weak content has missing OG fields (title/image) back-filled.
 */
export const fetchUrlContentDetailed = async (
    url: string,
    options?: { oauthToken?: string },
): Promise<FetchResult> => {
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
        console.error(`[Content Router] SSRF blocked: ${urlValidation.error}`);
        return errorResult('FETCH_NETWORK', 'SSRF blocked', false, []);
    }

    const platform = detectPlatform(url);
    const FetcherClass = FETCHER_MAP[platform] ?? FETCHER_MAP.web;
    const fetcher = new FetcherClass();
    const result = await fetcher.fetch(url, options?.oauthToken ? { oauthToken: options.oauthToken } : undefined);

    // ── OG-meta rescue for empty / blocked-with-null ──
    if (result.kind === 'empty' || (result.kind === 'blocked' && result.content === null)) {
        try {
            const og = await fetchOgMeta(url);
            if (og.title || og.image) {
                const content: FetchedUrlContent = {
                    rawText: og.description ?? '',
                    images: og.image ? [og.image] : [],
                    title: og.title ?? undefined,
                    description: og.description ?? undefined,
                };
                if (result.kind === 'empty') {
                    return weakResult(content, 'og-meta', result.attempts);
                }
                return blockedResult(result.code, content, result.attempts);
            }
        } catch {
            // Non-fatal — return the original result below.
        }
        return result;
    }

    // ── Back-fill missing OG fields on content-bearing results ──
    if (result.kind === 'success' || result.kind === 'weak') {
        if (isThinContent(result.content)) {
            await fillMissingOgFields(result.content, url);
        }
    } else if (result.kind === 'blocked' && result.content) {
        if (isThinContent(result.content)) {
            await fillMissingOgFields(result.content, url);
        }
    }

    return result;
};

/**
 * Backward-compatible adapter: returns just the extracted content.
 * Existing callers (e.g. /api/analyze) rely on this shape.
 */
export const fetchUrlContent = async (
    url: string,
    options?: { oauthToken?: string },
): Promise<FetchedUrlContent> => contentOf(await fetchUrlContentDetailed(url, options));
