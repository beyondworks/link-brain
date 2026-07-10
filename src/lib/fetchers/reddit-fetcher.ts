/**
 * Reddit Fetcher — tiered escalation for reddit posts.
 *
 * Chain: post .rss (Atom, WAF-friendly) → post .json (often 403) →
 * Jina Reader → OG-meta.
 */

import { runEscalationChain, type FetchStep, type StepOutcome } from './escalation';
import { validateFetchResponse } from './validation';
import { extractRedditPost } from './url-transforms';
import { fetchWithTimeout } from './utils';
import {
    BROWSER_UA,
    stripHtmlTags,
    runJinaStep,
    runOgMetaStep,
} from './step-helpers';
import type { FetchResult } from './fetch-result';
import type { FetchedUrlContent, PlatformFetcher } from './types';

/** Build the .rss URL for a post, or fall back to appending .rss to the path. */
const toRssUrl = (url: string): string => {
    const ref = extractRedditPost(url);
    if (ref) {
        return `https://www.reddit.com/r/${ref.subreddit}/comments/${ref.postId}.rss`;
    }
    return `${url.replace(/\/$/, '')}.rss`;
};

interface RedditRssPost {
    title: string;
    text: string;
    thumbnail: string | null;
}

/** Parse the first <entry> of a reddit Atom feed (the post itself). */
export const parseRedditRss = (xml: string): RedditRssPost => {
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i);
    const entry = entryMatch ? entryMatch[1] : xml;

    const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? stripHtmlTags(titleMatch[1]).trim() : '';

    const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
    const text = contentMatch ? stripHtmlTags(contentMatch[1]).trim() : '';

    const thumbMatch = entry.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
    const thumbnail = thumbMatch ? thumbMatch[1] : null;

    return { title, text, thumbnail };
};

const runRss = async (url: string): Promise<StepOutcome> => {
    const rssUrl = toRssUrl(url);
    const res = await fetchWithTimeout(
        rssUrl,
        { headers: { 'User-Agent': BROWSER_UA, Accept: 'application/atom+xml,application/xml;q=0.9,text/xml;q=0.8' } },
        12000,
    );

    const body = await res.text();
    const gate = validateFetchResponse({ httpStatus: res.status, body });
    if (gate.verdict !== 'ok') return { verdict: gate.verdict, detail: gate.detail, httpStatus: res.status };

    const post = parseRedditRss(body);
    if (!post.text && !post.title) return { verdict: 'empty' };

    const rawText = post.text || post.title;
    const content: FetchedUrlContent = {
        rawText,
        images: post.thumbnail ? [post.thumbnail] : [],
        title: post.title || undefined,
    };
    const { verdict } = validateFetchResponse({ httpStatus: 200, body: rawText });
    return { verdict: verdict === 'ok' ? 'ok' : 'weak', content };
};

// ── post .json (opportunistic — reddit often serves a 403 challenge) ────────

interface RedditJsonPost {
    data?: {
        children?: Array<{
            data?: {
                title?: string;
                selftext?: string;
                url?: string;
                preview?: { images?: Array<{ source?: { url?: string } }> };
            };
        }>;
    };
}

const runJson = async (url: string): Promise<StepOutcome> => {
    const jsonUrl = `${url.replace(/\/$/, '')}.json`;
    const res = await fetchWithTimeout(
        jsonUrl,
        { headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' } },
        12000,
    );

    const body = await res.text();
    const gate = validateFetchResponse({ httpStatus: res.status, body, expectJson: true });
    if (gate.verdict !== 'ok') return { verdict: gate.verdict, detail: gate.detail, httpStatus: res.status };

    let listings: RedditJsonPost[];
    try {
        listings = JSON.parse(body) as RedditJsonPost[];
    } catch {
        return { verdict: 'empty' };
    }

    const post = listings?.[0]?.data?.children?.[0]?.data;
    if (!post) return { verdict: 'empty' };

    const rawText = [post.title, post.selftext].filter(Boolean).join('\n\n').trim();
    if (!rawText) return { verdict: 'empty' };

    const images: string[] = [];
    for (const img of post.preview?.images ?? []) {
        const src = img.source?.url;
        if (src) images.push(src.replace(/&amp;/g, '&'));
    }

    const content: FetchedUrlContent = {
        rawText,
        images,
        title: post.title || undefined,
    };
    const { verdict } = validateFetchResponse({ httpStatus: 200, body: rawText });
    return { verdict: verdict === 'ok' ? 'ok' : 'weak', content };
};

export class RedditFetcher implements PlatformFetcher {
    async fetch(url: string): Promise<FetchResult> {
        const steps: FetchStep[] = [
            { method: 'reddit:rss', tier: 'api', run: () => runRss(url) },
            { method: 'reddit:json', tier: 'api', run: () => runJson(url) },
            { method: 'jina', tier: 'reader', run: () => runJinaStep(url) },
            { method: 'og-meta', tier: 'html', run: () => runOgMetaStep(url) },
        ];
        return runEscalationChain(steps);
    }
}
