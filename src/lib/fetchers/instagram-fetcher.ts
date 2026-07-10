/**
 * Instagram Fetcher — tiered escalation for Instagram posts.
 *
 * Chain: Jina Reader (auth-gate validated) → Googlebot HTML (scontent CDN
 * images + caption) → OG-meta. Instagram walls most content behind login, so
 * the honest outcome is usually 'weak' (card/caption + images, no full text).
 */

import { runEscalationChain, type FetchStep, type StepOutcome } from './escalation';
import { validateFetchResponse } from './validation';
import { fetchWithTimeout, extractImagesFromHtml } from './utils';
import {
    GOOGLEBOT_UA,
    mapHttpErrorToVerdict,
    stripHtmlTags,
    runJinaStep,
    runOgMetaStep,
} from './step-helpers';
import type { FetchResult } from './fetch-result';
import type { FetchedUrlContent, PlatformFetcher } from './types';

/** Read a single meta-tag content value (og:* / name=*) from raw HTML. */
const readMeta = (html: string, key: string): string | null => {
    const patterns = [
        new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`, 'i'),
    ];
    for (const re of patterns) {
        const match = html.match(re);
        if (match?.[1]) return stripHtmlTags(match[1]);
    }
    return null;
};

const runGooglebotHtml = async (url: string): Promise<StepOutcome> => {
    const res = await fetchWithTimeout(
        url,
        { headers: { 'User-Agent': GOOGLEBOT_UA, Accept: 'text/html' } },
        8000,
    );
    if (!res.ok) return { verdict: mapHttpErrorToVerdict(res.status), httpStatus: res.status };

    const html = await res.text();
    const gate = validateFetchResponse({ httpStatus: res.status, body: html });
    if (gate.verdict === 'challenge' || gate.verdict === 'auth_gate' ||
        gate.verdict === 'rate_limited' || gate.verdict === 'not_found') {
        return { verdict: gate.verdict, detail: gate.detail, httpStatus: res.status };
    }

    const images = extractImagesFromHtml(html);
    const caption = readMeta(html, 'og:description') ?? '';
    const title = readMeta(html, 'og:title') ?? undefined;
    if (images.length === 0 && !caption) return { verdict: 'empty' };

    const content: FetchedUrlContent = { rawText: caption, images, title };
    // Instagram HTML rarely carries full post text — treat as a weak (partial) win.
    return { verdict: 'weak', content };
};

export class InstagramFetcher implements PlatformFetcher {
    async fetch(url: string): Promise<FetchResult> {
        const steps: FetchStep[] = [
            { method: 'jina', tier: 'reader', run: () => runJinaStep(url) },
            { method: 'defuddle', tier: 'html', run: () => runGooglebotHtml(url) },
            { method: 'og-meta', tier: 'html', run: () => runOgMetaStep(url) },
        ];
        return runEscalationChain(steps);
    }
}
