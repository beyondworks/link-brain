/**
 * Web Fetcher — tiered escalation for general web content.
 *
 * Chain: Defuddle (local HTML parse, one URL-transform retry on a challenge) →
 * Jina Reader → Readability → OG-meta. Each step keeps the existing quality
 * heuristics (isWeakWebResult) to decide ok vs weak.
 */

import { normalizeWeb } from './normalizers/web';
import { extractWithReadability } from './readability-fetcher';
import { isDefuddleEnabled, parseWithDefuddle } from './defuddle-extractor';
import { toMobileUrl, dropWww } from './url-transforms';
import { runEscalationChain, type FetchStep, type StepOutcome } from './escalation';
import { validateFetchResponse } from './validation';
import { fetchWithTimeout, hasAuthGate } from './utils';
import { BROWSER_UA, mapHttpErrorToVerdict, runJinaStep, runOgMetaStep } from './step-helpers';
import type { FetchResult } from './fetch-result';
import type { FetchedUrlContent, PlatformFetcher } from './types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const isWeakWebResult = (content: FetchedUrlContent): boolean => {
    const text = content.rawText || '';
    return !text || text.length < 280 || hasAuthGate(text);
};

/**
 * Apply Web-specific text normalization (SINGLE PASS).
 * Falls back to original text if normalization loses too much content.
 */
const applyWebNormalization = (content: FetchedUrlContent): FetchedUrlContent => {
    const original = content.rawText || '';
    if (!original || original.length < 50) return content;

    const normalized = normalizeWeb(original);
    const lossRate = 1 - normalized.length / original.length;
    const tooAggressive = normalized.length < 100 || lossRate > 0.7;
    const effectiveText = tooAggressive ? original : normalized;

    return { ...content, rawText: effectiveText, rawTextOriginal: original };
};

/** Clean markdown noise from Jina Reader output for generic web pages. */
const cleanJinaWebContent = (content: string): string => {
    if (!content) return '';
    let cleaned = content;
    cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    cleaned = cleaned.replace(/\[?Image\s*\d*:?\s*[^\]]*\]?\([^)]+\)/gi, '');
    cleaned = cleaned.replace(/\[Image\s*\d+:.*?\]/gi, '');
    cleaned = cleaned.replace(/^https?:\/\/[^\s]+$/gm, '');
    cleaned = cleaned.replace(/^\d+\s*$/gm, '');
    cleaned = cleaned.replace(/^\d+[KkMm]?\s*(likes?|views?|reposts?|replies?|comments?)?\s*$/gim, '');

    const uiPatterns = [
        /^Translate$/gim, /^-Author$/gim, /^Author$/gim,
        /^View all \d+ replies?$/gim, /^Show more$/gim, /^Hide$/gim,
        /^Share$/gim, /^Reply$/gim, /^Repost$/gim, /^Quote$/gim, /^Like$/gim,
        /^Log in.*$/gim, /^Sign up.*$/gim, /^Create new account.*$/gim,
        /^Forgot password.*$/gim, /^Log in with Facebook$/gim,
        /^About.*Meta.*$/gim, /^\[Meta\].*$/gim, /^\[About\].*$/gim,
        /^\[Blog\].*$/gim, /^\[Jobs\].*$/gim, /^\[Help\].*$/gim,
        /^\* \* \*$/gm, /^• • •$/gm,
        /^Sorry, we're having trouble playing this video\.?$/gim,
    ];
    for (const pattern of uiPatterns) cleaned = cleaned.replace(pattern, '');

    cleaned = cleaned.replace(/^[\s*\-•·|=_]+$/gm, '');
    cleaned = cleaned.replace(/\[\]\([^)]+\)/g, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
};

// ============================================================================
// STEPS
// ============================================================================

/** Fetch + Defuddle-parse a single URL, returning ok / weak / gate verdict. */
const attemptDefuddle = async (targetUrl: string): Promise<StepOutcome> => {
    const res = await fetchWithTimeout(
        targetUrl,
        {
            headers: {
                'User-Agent': BROWSER_UA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            },
        },
        15000,
    );
    if (!res.ok) return { verdict: mapHttpErrorToVerdict(res.status), httpStatus: res.status };

    const html = await res.text();
    const gate = validateFetchResponse({ httpStatus: res.status, body: html });
    if (gate.verdict === 'challenge' || gate.verdict === 'auth_gate' ||
        gate.verdict === 'rate_limited' || gate.verdict === 'not_found') {
        return { verdict: gate.verdict, detail: gate.detail, httpStatus: res.status };
    }

    const parsed = await parseWithDefuddle(html, targetUrl);
    const normalized = applyWebNormalization(parsed);
    if (!normalized.rawText) return { verdict: 'empty' };
    return { verdict: isWeakWebResult(normalized) ? 'weak' : 'ok', content: normalized };
};

const runDefuddleStep = async (url: string): Promise<StepOutcome> => {
    if (!isDefuddleEnabled()) return { verdict: 'empty' };

    const first = await attemptDefuddle(url);
    // On a WAF challenge, try ONE URL-transform variant before escalating tiers.
    if (first.verdict === 'challenge') {
        const mobile = toMobileUrl(url);
        const variant = mobile !== url ? mobile : dropWww(url);
        if (variant !== url) {
            const second = await attemptDefuddle(variant);
            if (second.verdict === 'ok' || second.verdict === 'weak') return second;
        }
    }
    return first;
};

const runJinaWebStep = async (url: string): Promise<StepOutcome> => {
    const outcome = await runJinaStep(url, { clean: cleanJinaWebContent });
    if (!outcome.content) return outcome;
    const normalized = applyWebNormalization(outcome.content);
    return { verdict: isWeakWebResult(normalized) ? 'weak' : 'ok', content: normalized };
};

const runReadabilityStep = async (url: string): Promise<StepOutcome> => {
    const result = await extractWithReadability(url);
    if (!result.rawText) return { verdict: 'empty' };
    const normalized = applyWebNormalization(result);
    return { verdict: isWeakWebResult(normalized) ? 'weak' : 'ok', content: normalized };
};

// ============================================================================
// MAIN FETCHER
// ============================================================================

export class WebFetcher implements PlatformFetcher {
    async fetch(url: string): Promise<FetchResult> {
        const steps: FetchStep[] = [
            { method: 'defuddle', tier: 'html', run: () => runDefuddleStep(url) },
            { method: 'jina', tier: 'reader', run: () => runJinaWebStep(url) },
            { method: 'readability', tier: 'html', run: () => runReadabilityStep(url) },
            { method: 'og-meta', tier: 'html', run: () => runOgMetaStep(url) },
        ];
        return runEscalationChain(steps);
    }
}
