/**
 * Fetchers — barrel export
 */

// Main entry point
export { fetchUrlContent } from './orchestrator';

// Types
export type { FetchedUrlContent, PlatformFetcher, PlatformFetcherOptions } from './types';

// Platform detection
export { detectPlatform } from './platform-detector';

// URL validation
export { validateUrl, requireValidUrl } from './url-validator';
export type { UrlValidationResult } from './url-validator';

// Utilities
export {
    fetchWithTimeout,
    extractImagesFromMarkdown,
    splitThreadsSections,
    buildThreadsSections,
    hasAuthGate,
    selectBetterText,
} from './utils';

// Normalizers
export { normalizeThreads } from './normalizers/threads';
export type { NormalizeThreadsOptions } from './normalizers/threads';
export { normalizeWeb, cleanGenericMarkdown } from './normalizers/web';
export { normalizeNaverBlog } from './normalizers/naver';

// Platform fetchers
export { WebFetcher } from './web-fetcher';
export { YouTubeFetcher } from './youtube-fetcher';
export { ThreadsFetcher } from './threads-fetcher';
export { InstagramFetcher } from './instagram-fetcher';
export { NaverFetcher } from './naver-fetcher';
export { SocialFetcher } from './social-fetcher';

// Feature flags
export { ENABLE_WEB_FALLBACK_MERGE, ENABLE_THREADS_AUTHOR_ONLY_CHAIN } from './feature-flags';
