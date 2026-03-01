/**
 * URL Content Orchestrator
 *
 * Routes URLs to platform-specific fetchers and returns normalized content.
 * Pure function — no framework dependencies.
 */

import { validateUrl } from './url-validator';
import { detectPlatform } from './platform-detector';
import { ThreadsFetcher } from './threads-fetcher';
import { YouTubeFetcher } from './youtube-fetcher';
import { NaverFetcher } from './naver-fetcher';
import { InstagramFetcher } from './instagram-fetcher';
import { SocialFetcher } from './social-fetcher';
import { WebFetcher } from './web-fetcher';
import type { FetchedUrlContent, PlatformFetcher } from './types';

const FETCHER_MAP: Record<string, new () => PlatformFetcher> = {
    threads: ThreadsFetcher,
    youtube: YouTubeFetcher,
    naver: NaverFetcher,
    instagram: InstagramFetcher,
    twitter: SocialFetcher,
    pinterest: SocialFetcher,
    web: WebFetcher,
};

/**
 * Fetch content from a URL, routing to the appropriate platform fetcher.
 *
 * Strategy:
 * 1. Social media (Threads/Instagram/Twitter) — Puppeteer first
 * 2. YouTube — API v3 + transcript first, Jina/oEmbed/Puppeteer fallback
 * 3. Naver Blog — Mobile version + Jina Reader
 * 4. General web — Jina Reader with optional Puppeteer fallback
 */
export const fetchUrlContent = async (url: string): Promise<FetchedUrlContent> => {
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
        console.error(`[Content Router] SSRF blocked: ${urlValidation.error}`);
        return { rawText: '', images: [] };
    }

    const platform = detectPlatform(url);
    const FetcherClass = FETCHER_MAP[platform] ?? FETCHER_MAP.web;
    console.log(`[Content Router] ${platform} -> ${FetcherClass.name}`);

    const fetcher = new FetcherClass();
    return fetcher.fetch(url);
};
