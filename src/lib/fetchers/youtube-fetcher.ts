/**
 * YouTube Fetcher — tiered escalation for YouTube videos.
 *
 * Chain: Data API v3 + transcript (best) → Defuddle supplement → Jina Reader
 * supplement. The API metadata is captured once and merged into the
 * supplement description so the richest available text always wins.
 */

import {
    extractYouTubeContent,
    buildYouTubeRichText,
    type YouTubeVideoData,
} from './youtube-extractor';
import { isDefuddleEnabled, extractWithDefuddle } from './defuddle-extractor';
import { fetchWithTimeout } from './utils';
import { runEscalationChain, type FetchStep, type StepOutcome } from './escalation';
import { runJinaStep } from './step-helpers';
import type { FetchResult } from './fetch-result';
import type { FetchedUrlContent, PlatformFetcher } from './types';

/** Wrap parsed YouTube metadata into FetchedUrlContent. */
const buildYtContent = (
    data: YouTubeVideoData,
    url: string,
    images?: string[],
): FetchedUrlContent => ({
    rawText: buildYouTubeRichText(data),
    images: data.thumbnailUrl ? [data.thumbnailUrl] : images ?? [],
    author: data.channelTitle || undefined,
    authorHandle: data.channelTitle || undefined,
    finalUrl: url,
});

/** Minimal metadata via oEmbed — last resort when the Data API returns null. */
const fetchYouTubeOEmbed = async (url: string): Promise<FetchedUrlContent | null> => {
    try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const res = await fetchWithTimeout(oembedUrl, {}, 10000);
        if (!res.ok) return null;
        const data = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
        const parts = [data.title, data.author_name ? `Channel: ${data.author_name}` : ''].filter(Boolean);
        if (parts.length === 0) return null;
        return {
            rawText: parts.join('\n\n'),
            images: data.thumbnail_url ? [data.thumbnail_url] : [],
            author: data.author_name || undefined,
            authorHandle: data.author_name || undefined,
        };
    } catch {
        return null;
    }
};

/** Remove UI chrome and recommended-video noise from Jina YouTube markdown. */
const cleanYouTubePageText = (raw: string): string => {
    let cleaned = raw;
    cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    cleaned = cleaned.replace(/\[]\([^)]+\)/g, '');
    cleaned = cleaned.replace(/^https?:\/\/[^\s]+$/gm, '');
    cleaned = cleaned.replace(/^\d+\s*$/gm, '');
    cleaned = cleaned.replace(/^(Skip navigation|Search with your voice|Search|Back|Sign in.*|Subscribed|YouTube Home)\s*$/gim, '');
    cleaned = cleaned.replace(/^(구독|Subscribe|좋아요|Like|싫어요|Dislike|공유|Share|저장|Save|더보기|Show more|간략히|Show less|댓글|Comments?|정렬 기준|Sort by|Transcript|Show transcript|Follow along using the transcript\.?|\.\.\.more|감사합니다|Thanks|클립|Clip|오프라인 저장|Download|신고|Report|자세히|Learn more)\s*$/gim, '');
    cleaned = cleaned.replace(/^Channel:\s+.+$/gm, '');
    cleaned = cleaned.replace(/^[\d,.]+[KMB]?\s*(subscribers?|구독자)\s*$/gim, '');
    cleaned = cleaned.replace(/\d[\d,.]*\s*(회|views?|조회수)[^\n]*/gi, '');
    cleaned = cleaned.replace(/\d+\s*(시간|분|일|주|개월|년|hours?|minutes?|days?|weeks?|months?|years?)\s*(전|ago)/gi, '');
    cleaned = cleaned.replace(/^Sign in to confirm.*$/gim, '');
    cleaned = cleaned.replace(/^\[Sign in\].*$/gm, '');
    cleaned = cleaned.replace(/^\[Learn more\].*$/gm, '');
    cleaned = cleaned.replace(/\[[^\]]*\]\(https?:\/\/(www\.)?(youtu\.be|youtube\.com)[^)]*\)\s*/g, '');
    cleaned = cleaned.replace(/(^.{1,80}\n){2,4}/gm, (block: string) => {
        const lines = block.split('\n').filter(Boolean);
        const looksLikeContent = lines.some((l: string) => l.length > 80 || /[.,!?]/.test(l));
        return looksLikeContent ? block : '';
    });
    cleaned = cleaned.replace(/^(댓글\s*\d*|[Cc]omments?\s*\d*)\s*$/gm, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    return cleaned;
};

export class YouTubeFetcher implements PlatformFetcher {
    async fetch(url: string): Promise<FetchResult> {
        // Captured once — every step below merges into this metadata when present.
        const ytData = await extractYouTubeContent(url);

        const apiStep: FetchStep = {
            method: 'youtube:api',
            tier: 'api',
            run: async (): Promise<StepOutcome> => {
                if (ytData?.hasTranscript) {
                    return { verdict: 'ok', content: buildYtContent(ytData, url) };
                }
                if (ytData) {
                    // Metadata only — keep as a weak fallback while supplements are tried.
                    return { verdict: 'weak', content: buildYtContent(ytData, url) };
                }
                const oembed = await fetchYouTubeOEmbed(url);
                return oembed ? { verdict: 'weak', content: oembed } : { verdict: 'empty' };
            },
        };

        const defuddleStep: FetchStep = {
            method: 'defuddle',
            tier: 'html',
            run: async (): Promise<StepOutcome> => {
                if (!isDefuddleEnabled()) return { verdict: 'empty' };
                const d = await extractWithDefuddle(url);
                if (!d.rawText || d.rawText.length < 100) return { verdict: 'empty' };
                if (ytData) {
                    return { verdict: 'ok', content: buildYtContent({ ...ytData, description: d.rawText }, url, d.images) };
                }
                return { verdict: 'ok', content: d };
            },
        };

        const jinaStep: FetchStep = {
            method: 'jina',
            tier: 'reader',
            run: async (): Promise<StepOutcome> => {
                const outcome = await runJinaStep(url, { clean: cleanYouTubePageText });
                const text = outcome.content?.rawText ?? '';
                if (!outcome.content || text.length < 100) return { verdict: outcome.verdict };
                if (ytData) {
                    return {
                        verdict: 'ok',
                        content: buildYtContent({ ...ytData, description: text }, url, outcome.content.images),
                    };
                }
                return { verdict: 'ok', content: outcome.content };
            },
        };

        return runEscalationChain([apiStep, defuddleStep, jinaStep]);
    }
}
