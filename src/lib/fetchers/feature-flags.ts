/**
 * Fetcher Feature Flags
 *
 * Simple boolean constants controlling fetcher behavior.
 * In v2 all isolated fetchers are always enabled (no legacy fallback path).
 */

/** Enable Puppeteer fallback merge for weak web extraction results */
export const ENABLE_WEB_FALLBACK_MERGE = true;

/** Enable author-only chain filtering for Threads comments */
export const ENABLE_THREADS_AUTHOR_ONLY_CHAIN = true;
