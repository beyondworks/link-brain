/**
 * Fetch Response Validation — WAF-aware "HTTP 200 ≠ success" validator.
 *
 * Ports the insane-search 4-layer validation model into TypeScript. A response
 * is only "ok" after passing HTTP semantics, challenge-marker, auth-gate, and
 * size heuristics. Callers use the verdict to decide whether to escalate.
 *
 * NOTE: the marker arrays below are FETCH-INTERNAL constants (WAF/challenge
 * fingerprints), NOT UI constants — they intentionally do NOT live in
 * @/config/constants.ts, which is reserved for design-system/platform UI values.
 */

import { hasAuthGate } from './utils';
import type { FetchVerdict } from './fetch-result';

/** Hard WAF/challenge fingerprints — presence alone implies a challenge page. */
const HARD_CHALLENGE_MARKERS: readonly string[] = [
    'just a moment...',
    'checking your browser',
    'request unsuccessful. incapsula',
    'attention required! | cloudflare',
    'ddos protection by',
    'sec-if-cpt-container', // DataDome
    'px-captcha', // PerimeterX
    '_incapsula_resource',
    'access denied</h1>',
];

/** Soft markers — only a challenge when combined with a small body or 4xx. */
const SOFT_CHALLENGE_MARKERS: readonly string[] = [
    'access denied',
    'captcha',
    'verify you are human',
    'are you a robot',
];

const SMALL_BODY_BYTES = 3000;
const AUTH_GATE_BODY_BYTES = 5000;
const AUTH_GATE_HEAD_CHARS = 2000;

export interface ValidateInput {
    httpStatus: number;
    headers?: Headers | Record<string, string>;
    body: string;
    expectJson?: boolean;
}

export interface ValidateOutput {
    verdict: FetchVerdict;
    detail?: string;
}

const encoder = new TextEncoder();
const byteLength = (text: string): number => encoder.encode(text).length;

/** True when body parses as JSON or looks like well-formed XML. */
const isParseableStructured = (body: string, expectJson?: boolean): boolean => {
    const trimmed = body.trim();
    if (!trimmed) return false;

    if (expectJson || trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            JSON.parse(trimmed);
            return true;
        } catch {
            // not valid JSON; continue to XML check
        }
    }

    // XML/RSS feeds are exempt, but HTML documents are NOT (they fall through
    // to the size gate). Only an XML prolog or a feed root element qualifies.
    if (/^<\?xml[\s>]/i.test(trimmed) || /^<(rss|feed|atom)[\s>]/i.test(trimmed)) {
        return true;
    }
    return false;
};

/**
 * Validate a fetch response body against WAF/auth/size heuristics.
 * HTTP 200 is NOT treated as automatic success.
 */
export const validateFetchResponse = (input: ValidateInput): ValidateOutput => {
    const { httpStatus, body, expectJson } = input;
    const lower = (body || '').toLowerCase();
    const bytes = byteLength(body || '');
    const structured = isParseableStructured(body || '', expectJson);

    // ── Layer 1: HTTP semantics ───────────────────────────────────────────
    if (httpStatus === 404 || httpStatus === 410) {
        return { verdict: 'not_found' };
    }
    if (httpStatus === 429) {
        return { verdict: 'rate_limited' };
    }
    if (httpStatus >= 500) {
        return { verdict: 'http_error', detail: `http ${httpStatus}` };
    }
    // 401/403 → challenge (WAF) unless the body is clearly an auth gate.
    if (httpStatus === 401 || httpStatus === 403) {
        if (isAuthGateDominant(lower, bytes)) {
            return { verdict: 'auth_gate' };
        }
        // Still surface a specific hard marker if one matched.
        const hard = matchMarker(lower, HARD_CHALLENGE_MARKERS);
        return { verdict: 'challenge', detail: hard ?? `http ${httpStatus}` };
    }

    // ── Layer 2: hard challenge markers ───────────────────────────────────
    const hardMarker = matchMarker(lower, HARD_CHALLENGE_MARKERS);
    if (hardMarker) {
        return { verdict: 'challenge', detail: hardMarker };
    }

    // ── Layer 3: soft challenge markers (small body OR 4xx) ────────────────
    const is4xx = httpStatus >= 400 && httpStatus < 500;
    const softMarker = matchMarker(lower, SOFT_CHALLENGE_MARKERS);
    if (softMarker && (bytes < SMALL_BODY_BYTES || is4xx)) {
        return { verdict: 'challenge', detail: softMarker };
    }

    // ── Layer 3b: auth-gate (only when the gate dominates the body) ────────
    if (isAuthGateDominant(lower, bytes)) {
        return { verdict: 'auth_gate' };
    }

    // ── Layer 4: size heuristic ───────────────────────────────────────────
    // Valid parseable JSON/XML is exempt regardless of size.
    if (!structured && bytes < SMALL_BODY_BYTES) {
        return { verdict: 'weak' };
    }

    if (!body || bytes === 0) {
        return { verdict: 'empty' };
    }

    return { verdict: 'ok' };
};

const matchMarker = (lowerBody: string, markers: readonly string[]): string | undefined => {
    for (const marker of markers) {
        if (lowerBody.includes(marker)) return marker;
    }
    return undefined;
};

/**
 * Auth-gate is "dominant" only when the login/signup wall is the whole page,
 * not an article that merely mentions "sign up". Require the gate marker AND
 * either a small body or the marker appearing near the start.
 */
const isAuthGateDominant = (lowerBody: string, bytes: number): boolean => {
    if (!hasAuthGate(lowerBody)) return false;
    if (bytes < AUTH_GATE_BODY_BYTES) return true;
    const head = lowerBody.slice(0, AUTH_GATE_HEAD_CHARS);
    return hasAuthGate(head);
};
