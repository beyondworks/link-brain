/**
 * Naver Blog Fetcher — tiered escalation for Naver Blog posts.
 *
 * Chain: mobile HTML (iPhone UA, no-iframe variant, Defuddle-parsed) →
 * Jina Reader on the mobile URL → OG-meta. normalizeNaverBlog is applied
 * exactly once, inside whichever step produces the content.
 */

import { runEscalationChain, type FetchStep, type StepOutcome } from './escalation';
import { validateFetchResponse } from './validation';
import { parseWithDefuddle } from './defuddle-extractor';
import { normalizeNaverBlog } from './normalizers/naver';
import { toNaverMobileUrl } from './url-transforms';
import { fetchWithTimeout } from './utils';
import {
    IPHONE_UA,
    mapHttpErrorToVerdict,
    runJinaStep,
    runOgMetaStep,
} from './step-helpers';
import type { FetchResult } from './fetch-result';
import type { FetchedUrlContent, PlatformFetcher } from './types';

const runMobileHtml = async (url: string, mobileUrl: string): Promise<StepOutcome> => {
    const res = await fetchWithTimeout(
        mobileUrl,
        {
            headers: {
                'User-Agent': IPHONE_UA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9',
                'Referer': 'https://m.naver.com/',
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

    const parsed = await parseWithDefuddle(html, mobileUrl);
    const normalized = normalizeNaverBlog(parsed.rawText || '');
    if (!normalized) return { verdict: 'empty' };

    const content: FetchedUrlContent = { ...parsed, rawText: normalized, finalUrl: url };
    const { verdict } = validateFetchResponse({ httpStatus: 200, body: normalized });
    return { verdict: verdict === 'ok' ? 'ok' : 'weak', content };
};

export class NaverFetcher implements PlatformFetcher {
    async fetch(url: string): Promise<FetchResult> {
        const mobileUrl = toNaverMobileUrl(url);

        const steps: FetchStep[] = [
            { method: 'naver:mobile-html', tier: 'html', run: () => runMobileHtml(url, mobileUrl) },
            {
                method: 'naver:jina',
                tier: 'reader',
                run: async () => {
                    const outcome = await runJinaStep(mobileUrl, { clean: normalizeNaverBlog });
                    if (outcome.content) outcome.content.finalUrl = url;
                    return outcome;
                },
            },
            { method: 'og-meta', tier: 'html', run: () => runOgMetaStep(url) },
        ];
        return runEscalationChain(steps);
    }
}
