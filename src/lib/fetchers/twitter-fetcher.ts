/**
 * Twitter / X Fetcher — tiered escalation for tweets and profiles.
 *
 * Chain: syndication tweet-result (API) → oEmbed → profile timeline →
 * Jina Reader → OG-meta. Replaces the old Puppeteer SocialFetcher.
 */

import { runEscalationChain, type FetchStep, type StepOutcome } from './escalation';
import { validateFetchResponse } from './validation';
import { extractTweetId } from './url-transforms';
import { fetchWithTimeout } from './utils';
import {
    BROWSER_UA,
    mapHttpErrorToVerdict,
    stripHtmlTags,
    runJinaStep,
    runOgMetaStep,
} from './step-helpers';
import type { FetchResult } from './fetch-result';
import type { FetchedUrlContent, PlatformFetcher } from './types';

// ── syndication tweet-result (best structured source) ───────────────────────

interface TweetResult {
    text?: string;
    full_text?: string;
    user?: { name?: string; screen_name?: string; profile_image_url_https?: string };
    photos?: Array<{ url?: string }>;
    mediaDetails?: Array<{ media_url_https?: string; type?: string }>;
    created_at?: string;
}

const runTweetResult = async (tweetId: string): Promise<StepOutcome> => {
    const cdnUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=a`;
    const res = await fetchWithTimeout(
        cdnUrl,
        { headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' } },
        10000,
    );
    if (!res.ok) return { verdict: mapHttpErrorToVerdict(res.status), httpStatus: res.status };

    const body = await res.text();
    const { verdict, detail } = validateFetchResponse({ httpStatus: res.status, body, expectJson: true });
    if (verdict !== 'ok') return { verdict, detail, httpStatus: res.status };

    let data: TweetResult;
    try {
        data = JSON.parse(body) as TweetResult;
    } catch {
        return { verdict: 'empty' };
    }

    const text = data.text || data.full_text || '';
    if (!text) return { verdict: 'empty' };

    const images: string[] = [];
    for (const photo of data.photos ?? []) {
        if (photo.url && !images.includes(photo.url)) images.push(photo.url);
    }
    for (const media of data.mediaDetails ?? []) {
        if (media.media_url_https && !images.includes(media.media_url_https)) {
            images.push(media.media_url_https);
        }
    }

    const content: FetchedUrlContent = {
        rawText: text,
        images,
        author: data.user?.name || undefined,
        authorHandle: data.user?.screen_name ? `@${data.user.screen_name}` : undefined,
        authorAvatar: data.user?.profile_image_url_https || undefined,
    };
    return { verdict: 'ok', content };
};

// ── oEmbed (short, always available for public tweets) ──────────────────────

const runOEmbed = async (url: string): Promise<StepOutcome> => {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
    const res = await fetchWithTimeout(oembedUrl, { headers: { Accept: 'application/json' } }, 10000);
    if (!res.ok) return { verdict: mapHttpErrorToVerdict(res.status), httpStatus: res.status };

    const data = (await res.json()) as { html?: string; author_name?: string };
    const text = stripHtmlTags(data.html || '');
    if (!text) return { verdict: 'empty' };

    const content: FetchedUrlContent = {
        rawText: text,
        images: [],
        author: data.author_name || undefined,
    };
    // Tweet text is legitimate but usually short → validation yields 'weak'.
    const { verdict } = validateFetchResponse({ httpStatus: 200, body: text });
    return { verdict: verdict === 'ok' ? 'ok' : 'weak', content };
};

// ── profile timeline (only when there is no single tweet id) ────────────────

const extractHandle = (url: string): string | null => {
    try {
        const segment = new URL(url).pathname.split('/').filter(Boolean)[0];
        if (!segment) return null;
        const reserved = ['search', 'explore', 'home', 'i', 'settings', 'notifications', 'messages'];
        return reserved.includes(segment.toLowerCase()) ? null : segment.replace(/^@/, '');
    } catch {
        return null;
    }
};

/** Deep-collect tweet text fields from the __NEXT_DATA__ JSON tree. */
const collectTimelineTexts = (node: unknown, out: string[], depth = 0): void => {
    if (depth > 12 || out.length >= 10 || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
        for (const item of node) collectTimelineTexts(item, out, depth + 1);
        return;
    }
    const record = node as Record<string, unknown>;
    const text = record.full_text ?? record.text;
    if (typeof text === 'string' && text.trim().length > 0 && !out.includes(text)) {
        out.push(text.trim());
    }
    for (const value of Object.values(record)) {
        if (value && typeof value === 'object') collectTimelineTexts(value, out, depth + 1);
    }
};

const runTimeline = async (handle: string): Promise<StepOutcome> => {
    const timelineUrl = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}`;
    const res = await fetchWithTimeout(
        timelineUrl,
        { headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' } },
        10000,
    );
    if (!res.ok) return { verdict: mapHttpErrorToVerdict(res.status), httpStatus: res.status };

    const html = await res.text();
    const nextDataMatch = html.match(
        /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
    );
    if (!nextDataMatch) return { verdict: 'empty' };

    let parsed: unknown;
    try {
        parsed = JSON.parse(nextDataMatch[1]);
    } catch {
        return { verdict: 'empty' };
    }

    const texts: string[] = [];
    collectTimelineTexts(parsed, texts);
    if (texts.length === 0) return { verdict: 'empty' };

    const content: FetchedUrlContent = {
        rawText: texts.join('\n\n'),
        images: [],
        author: handle,
        authorHandle: `@${handle}`,
    };
    const { verdict } = validateFetchResponse({ httpStatus: 200, body: content.rawText });
    return { verdict: verdict === 'ok' ? 'ok' : 'weak', content };
};

// ── main fetcher ────────────────────────────────────────────────────────────

export class TwitterFetcher implements PlatformFetcher {
    async fetch(url: string): Promise<FetchResult> {
        const tweetId = extractTweetId(url);
        const handle = tweetId ? null : extractHandle(url);

        const steps: FetchStep[] = [];

        if (tweetId) {
            steps.push({ method: 'twitter:tweet-result', tier: 'api', run: () => runTweetResult(tweetId) });
            steps.push({ method: 'twitter:oembed', tier: 'api', run: () => runOEmbed(url) });
        } else if (handle) {
            steps.push({ method: 'twitter:timeline', tier: 'api', run: () => runTimeline(handle) });
        }

        steps.push({ method: 'jina', tier: 'reader', run: () => runJinaStep(url) });
        steps.push({ method: 'og-meta', tier: 'html', run: () => runOgMetaStep(url) });

        return runEscalationChain(steps);
    }
}
