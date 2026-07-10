/**
 * Fetch Result — Discriminated-union result type for the tiered fetch chain.
 *
 * Ports the "insane-search" verdict model into TypeScript: every fetch attempt
 * yields a verdict (ok / weak / challenge / auth_gate / …), and the chain
 * resolves to a single FetchResult that callers pattern-match on. Constructor
 * helpers keep individual fetchers terse; `contentOf` is the backward-compat
 * adapter for legacy call sites that expect a plain FetchedUrlContent.
 */

import type { FetchedUrlContent } from './types';

export type FetchMethod =
    | 'twitter:tweet-result' | 'twitter:oembed' | 'twitter:timeline'
    | 'reddit:rss' | 'reddit:json'
    | 'naver:mobile-html' | 'naver:jina'
    | 'youtube:api' | 'threads:oauth' | 'threads:scrape'
    | 'defuddle' | 'jina' | 'readability' | 'og-meta';

export type FetchVerdict =
    | 'ok' | 'weak' | 'challenge' | 'auth_gate'
    | 'rate_limited' | 'not_found' | 'http_error' | 'network_error' | 'empty';

export interface FetchAttempt {
    method: FetchMethod;
    verdict: FetchVerdict;
    httpStatus?: number;
    durationMs: number;
    /** e.g. matched challenge marker */
    detail?: string;
}

export type FetchErrorCode =
    | 'FETCH_BLOCKED' | 'FETCH_NOT_FOUND' | 'FETCH_RATE_LIMITED'
    | 'FETCH_TIMEOUT' | 'FETCH_NETWORK' | 'FETCH_EMPTY';

export type FetchResult =
    | { kind: 'success'; content: FetchedUrlContent; method: FetchMethod; attempts: FetchAttempt[] }
    | { kind: 'weak'; content: FetchedUrlContent; method: FetchMethod; attempts: FetchAttempt[] }
    | { kind: 'blocked'; code: 'FETCH_BLOCKED' | 'FETCH_RATE_LIMITED'; content: FetchedUrlContent | null; attempts: FetchAttempt[] }
    | { kind: 'error'; code: FetchErrorCode; message: string; retryable: boolean; attempts: FetchAttempt[] }
    | { kind: 'empty'; code: 'FETCH_EMPTY'; attempts: FetchAttempt[] };

// ============================================================================
// CONSTRUCTOR HELPERS
// ============================================================================

export const successResult = (
    content: FetchedUrlContent,
    method: FetchMethod,
    attempts: FetchAttempt[]
): FetchResult => ({ kind: 'success', content, method, attempts });

export const weakResult = (
    content: FetchedUrlContent,
    method: FetchMethod,
    attempts: FetchAttempt[]
): FetchResult => ({ kind: 'weak', content, method, attempts });

export const blockedResult = (
    code: 'FETCH_BLOCKED' | 'FETCH_RATE_LIMITED',
    content: FetchedUrlContent | null,
    attempts: FetchAttempt[]
): FetchResult => ({ kind: 'blocked', code, content, attempts });

export const errorResult = (
    code: FetchErrorCode,
    message: string,
    retryable: boolean,
    attempts: FetchAttempt[]
): FetchResult => ({ kind: 'error', code, message, retryable, attempts });

export const emptyResult = (attempts: FetchAttempt[]): FetchResult =>
    ({ kind: 'empty', code: 'FETCH_EMPTY', attempts });

/**
 * Backward-compat adapter: extract FetchedUrlContent from any result.
 * Returns the content for success/weak/blocked-with-content, else an empty shell.
 */
export const contentOf = (result: FetchResult): FetchedUrlContent => {
    if (result.kind === 'success' || result.kind === 'weak') {
        return result.content;
    }
    if (result.kind === 'blocked' && result.content) {
        return result.content;
    }
    return { rawText: '', images: [] };
};
