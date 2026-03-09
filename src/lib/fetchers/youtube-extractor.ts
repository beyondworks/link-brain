/**
 * YouTube Extractor — YouTube Data API v3 + transcript
 *
 * Extracts video metadata and transcript using the YouTube Data API.
 * Requires YOUTUBE_API_KEY environment variable.
 */

export interface YouTubeVideoData {
    videoId: string;
    title: string;
    description: string;
    channelTitle: string;
    thumbnailUrl: string;
    hasTranscript: boolean;
    transcript?: string;
    /** Transcript with [MM:SS] timestamps at ~2min intervals */
    timestampedTranscript?: string;
    duration?: string;
}

// ─── Timestamp helpers ──────────────────────────────────────────────────────

interface TranscriptEvent {
    tStartMs: number;
    text: string;
}

const formatTimestamp = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Group transcript events into time-chunked segments with timestamps.
 * Targets ~15 chunks max; minimum 1-minute chunks.
 */
const buildTimestampedTranscript = (events: TranscriptEvent[]): string => {
    if (events.length === 0) return '';

    const totalDurationMs = events[events.length - 1].tStartMs;
    const TARGET_CHUNKS = 15;
    const MIN_CHUNK_MS = 60_000;
    const chunkDurationMs = Math.max(MIN_CHUNK_MS, Math.ceil(totalDurationMs / TARGET_CHUNKS));

    const chunks: Array<{ startMs: number; text: string }> = [];
    let currentTexts: string[] = [];
    let chunkStartMs = 0;

    for (const event of events) {
        if (event.tStartMs - chunkStartMs >= chunkDurationMs && currentTexts.length > 0) {
            chunks.push({ startMs: chunkStartMs, text: currentTexts.join('').trim() });
            currentTexts = [];
            chunkStartMs = event.tStartMs;
        }
        currentTexts.push(event.text);
    }
    if (currentTexts.length > 0) {
        chunks.push({ startMs: chunkStartMs, text: currentTexts.join('').trim() });
    }

    return chunks
        .filter(c => c.text.length > 0)
        .map(c => `[${formatTimestamp(c.startMs)}] ${c.text}`)
        .join('\n\n');
};

/**
 * Extract YouTube video ID from URL
 */
const extractVideoId = (url: string): string | null => {
    const patterns = [
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /embed\/([a-zA-Z0-9_-]{11})/,
        /shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
};

/**
 * Fetch video metadata from YouTube Data API v3
 */
const fetchVideoMetadata = async (videoId: string, apiKey: string): Promise<Partial<YouTubeVideoData> | null> => {
    try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`;
        const response = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });

        if (!response.ok) {
            console.warn(`[YouTube Extractor] API returned ${response.status}`);
            return null;
        }

        const data = await response.json() as {
            items?: Array<{
                snippet?: {
                    title?: string;
                    description?: string;
                    channelTitle?: string;
                    thumbnails?: { high?: { url?: string }; default?: { url?: string } };
                };
                contentDetails?: { duration?: string };
            }>;
        };
        const item = data.items?.[0];
        if (!item) return null;

        const snippet = item.snippet || {};
        return {
            videoId,
            title: snippet.title || '',
            description: snippet.description || '',
            channelTitle: snippet.channelTitle || '',
            thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
            duration: item.contentDetails?.duration,
        };
    } catch (error) {
        console.error('[YouTube Extractor] Metadata fetch error:', error);
        return null;
    }
};

/**
 * Fetch transcript from YouTube video page via captionTracks.
 * Returns both plain text and timestamped transcript for chapter summaries.
 */
const fetchTranscript = async (videoId: string): Promise<{ plain: string; timestamped: string } | null> => {
    try {
        const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const res = await fetch(pageUrl, {
            headers: { 'Accept-Language': 'ko,en;q=0.9' },
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return null;
        const html = await res.text();

        const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
        if (!captionMatch) return null;

        const tracks = JSON.parse(captionMatch[1]) as Array<{
            baseUrl: string;
            languageCode: string;
            kind?: string;
        }>;
        if (!tracks.length) return null;

        const track =
            tracks.find(t => t.languageCode === 'ko') ??
            tracks.find(t => t.languageCode === 'en') ??
            tracks[0];

        const captionUrl = `${track.baseUrl}&fmt=json3`;
        const captionRes = await fetch(captionUrl, { signal: AbortSignal.timeout(10000) });
        if (!captionRes.ok) return null;

        const captionData = await captionRes.json() as {
            events?: Array<{ tStartMs?: number; segs?: Array<{ utf8: string }> }>;
        };

        const events: TranscriptEvent[] = (captionData.events ?? [])
            .filter(e => e.segs?.length)
            .map(e => ({
                tStartMs: e.tStartMs ?? 0,
                text: (e.segs ?? []).map(s => s.utf8).filter(Boolean).join(''),
            }))
            .filter(e => e.text.length > 0);

        const plain = events.map(e => e.text).join('').replace(/\n{3,}/g, '\n\n').trim();
        if (!plain) return null;

        const timestamped = buildTimestampedTranscript(events);

        return { plain, timestamped };
    } catch (err) {
        console.warn('[YouTube Extractor] Transcript fetch failed:', err);
        return null;
    }
};

/**
 * Extract YouTube content (metadata + transcript when available)
 */
export const extractYouTubeContent = async (url: string): Promise<YouTubeVideoData | null> => {
    const videoId = extractVideoId(url);
    if (!videoId) {
        console.warn('[YouTube Extractor] Could not extract video ID from URL');
        return null;
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.warn('[YouTube Extractor] YOUTUBE_API_KEY not set, using oEmbed fallback');
        // oEmbed fallback for basic metadata
        try {
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });
            if (!response.ok) return null;
            const data = await response.json() as {
                title?: string;
                author_name?: string;
                thumbnail_url?: string;
            };
            return {
                videoId,
                title: data.title || '',
                description: '',
                channelTitle: data.author_name || '',
                thumbnailUrl: data.thumbnail_url || '',
                hasTranscript: false,
            };
        } catch {
            return null;
        }
    }

    const metadata = await fetchVideoMetadata(videoId, apiKey);
    if (!metadata) return null;

    // Transcript 페칭 시도
    const transcript = await fetchTranscript(videoId);

    return {
        videoId,
        title: metadata.title || '',
        description: metadata.description || '',
        channelTitle: metadata.channelTitle || '',
        thumbnailUrl: metadata.thumbnailUrl || '',
        duration: metadata.duration,
        hasTranscript: !!transcript,
        transcript: transcript?.plain ?? undefined,
        timestampedTranscript: transcript?.timestamped ?? undefined,
    };
};

/**
 * Build rich text representation from YouTube video data
 */
export const buildYouTubeRichText = (data: YouTubeVideoData): string => {
    const parts: string[] = [];

    if (data.title) {
        parts.push(`Title: ${data.title}`);
    }

    if (data.channelTitle) {
        parts.push(`Channel: ${data.channelTitle}`);
    }

    if (data.hasTranscript && data.timestampedTranscript) {
        parts.push(`\nTranscript:\n${data.timestampedTranscript}`);
    } else if (data.hasTranscript && data.transcript) {
        parts.push(`\nTranscript:\n${data.transcript}`);
    } else if (data.description) {
        parts.push(`\nDescription:\n${data.description}`);
    }

    return parts.join('\n');
};
