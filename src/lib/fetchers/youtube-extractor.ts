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
    duration?: string;
}

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

    // Transcript fetching is not implemented in this stub
    // Add timedtext API or third-party transcript service here if needed
    return {
        videoId,
        title: metadata.title || '',
        description: metadata.description || '',
        channelTitle: metadata.channelTitle || '',
        thumbnailUrl: metadata.thumbnailUrl || '',
        duration: metadata.duration,
        hasTranscript: false,
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

    if (data.hasTranscript && data.transcript) {
        parts.push(`\nTranscript:\n${data.transcript}`);
    } else if (data.description) {
        parts.push(`\nDescription:\n${data.description}`);
    }

    return parts.join('\n');
};
