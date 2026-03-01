/**
 * Fetcher Types — Shared interfaces for platform-specific fetchers
 */

export interface FetchedUrlContent {
    rawText: string;
    rawTextOriginal?: string;
    htmlContent?: string;
    images: string[];
    author?: string;
    authorAvatar?: string;
    authorHandle?: string;
    finalUrl?: string;
    embeddedLinks?: Array<{ label: string; url: string }>;
}

export interface PlatformFetcherOptions {
    language?: string;
}

export interface PlatformFetcher {
    fetch(url: string, options?: PlatformFetcherOptions): Promise<FetchedUrlContent>;
}
