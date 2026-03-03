/**
 * Fetcher Types — Shared interfaces for platform-specific fetchers
 */

export interface FetchedUrlContent {
    rawText: string;
    rawTextOriginal?: string;
    htmlContent?: string;
    images: string[];
    /** Page title from structured metadata (e.g. Jina title field) */
    title?: string;
    /** Page description from structured metadata (e.g. OG description) */
    description?: string;
    author?: string;
    authorAvatar?: string;
    authorHandle?: string;
    finalUrl?: string;
    embeddedLinks?: Array<{ label: string; url: string }>;
}

export interface PlatformFetcherOptions {
    language?: string;
    /** OAuth token for authenticated API access (e.g. Threads Graph API) */
    oauthToken?: string;
}

export interface PlatformFetcher {
    fetch(url: string, options?: PlatformFetcherOptions): Promise<FetchedUrlContent>;
}
