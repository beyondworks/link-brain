/**
 * Step Helpers — shared FetchStep building blocks.
 *
 * Reusable step runners (Jina Reader, OG-meta) plus small utilities used by the
 * per-platform escalation chains. Keeping these in one place avoids five copies
 * of the Jina fetch/parse/validate dance across the platform fetchers.
 */

import { fetchWithTimeout, extractImagesFromMarkdown, fetchOgMeta } from './utils';
import { validateFetchResponse } from './validation';
import type { StepOutcome } from './escalation';
import type { FetchVerdict } from './fetch-result';
import type { FetchedUrlContent } from './types';

/** Browser-like UA used by API/CDN steps that reject default fetch agents. */
export const BROWSER_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Googlebot UA — surfaces SEO/OG markup on social pages behind login walls. */
export const GOOGLEBOT_UA =
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/** iPhone Safari UA — used for mobile-optimized (no-iframe) page variants. */
export const IPHONE_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/**
 * Map a non-2xx HTTP status to a fetch verdict. For 2xx responses the caller
 * should run {@link validateFetchResponse} against the body instead.
 */
export const mapHttpErrorToVerdict = (status: number): FetchVerdict => {
    if (status === 404 || status === 410) return 'not_found';
    if (status === 429) return 'rate_limited';
    if (status === 401 || status === 403) return 'challenge';
    if (status >= 500) return 'http_error';
    return 'weak';
};

/** Strip HTML tags and collapse whitespace. Best-effort, throw-free. */
export const stripHtmlTags = (html: string): string => {
    if (!html) return '';
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

interface JinaData {
    title?: string;
    description?: string;
    content?: string;
    html?: string;
    url?: string;
    images?: Array<string | { src?: string; url?: string; alt?: string }>;
    screenshotUrl?: string;
}

export interface JinaStepOptions {
    /** Optional content cleaner applied to Jina markdown before validation. */
    clean?: (content: string) => string;
    timeout?: number;
}

/**
 * Fetch a URL through the Jina Reader API and turn the response into a
 * StepOutcome. The extracted markdown (after `clean`) is validated for
 * auth-gates and size so that a login-wall or empty page escalates instead of
 * being treated as success.
 */
export const runJinaStep = async (
    url: string,
    opts?: JinaStepOptions,
): Promise<StepOutcome> => {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    const jinaApiKey = process.env.JINA_API_KEY;
    if (jinaApiKey) headers['Authorization'] = `Bearer ${jinaApiKey}`;

    const response = await fetchWithTimeout(jinaUrl, { headers }, opts?.timeout ?? 20000);
    if (!response.ok) {
        return { verdict: mapHttpErrorToVerdict(response.status), httpStatus: response.status };
    }

    const json = (await response.json()) as { data?: JinaData; content?: string; title?: string };
    const structured = (json.data ?? json) as JinaData;
    const rawContent = structured.content || '';
    if (!rawContent || rawContent.length < 20) {
        return { verdict: 'empty', httpStatus: 200 };
    }

    const images = extractImagesFromMarkdown(rawContent);
    if (Array.isArray(structured.images)) {
        for (const img of structured.images) {
            const imgUrl = typeof img === 'string' ? img : img.src || img.url || '';
            if (imgUrl && !images.includes(imgUrl)) images.push(imgUrl);
        }
    }
    if (structured.screenshotUrl && !images.includes(structured.screenshotUrl)) {
        images.push(structured.screenshotUrl);
    }

    const cleaned = opts?.clean ? opts.clean(rawContent) : rawContent;
    const content: FetchedUrlContent = {
        rawText: cleaned,
        images,
        title: structured.title || undefined,
        description: structured.description || undefined,
        htmlContent: structured.html || undefined,
    };

    const { verdict, detail } = validateFetchResponse({ httpStatus: 200, body: cleaned });
    if (verdict === 'ok') {
        return { verdict: 'ok', content };
    }
    // Auth-gate / weak / empty — surface the verdict but keep partial content so
    // the escalation chain can fall back to it if nothing better appears.
    return { verdict, content: cleaned ? content : undefined, detail };
};

/**
 * Final-tier step: read OG/Twitter card metadata. Always yields at most a
 * 'weak' verdict — card metadata is never a substitute for full content.
 */
export const runOgMetaStep = async (url: string): Promise<StepOutcome> => {
    const og = await fetchOgMeta(url);
    if (!og.title && !og.image && !og.description) {
        return { verdict: 'empty' };
    }
    const content: FetchedUrlContent = {
        rawText: og.description ?? '',
        images: og.image ? [og.image] : [],
        title: og.title ?? undefined,
        description: og.description ?? undefined,
    };
    return { verdict: 'weak', content };
};
