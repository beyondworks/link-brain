/**
 * Shared Fetcher Utilities
 *
 * Common helpers used across multiple platform fetchers.
 */

/**
 * Simple fetch with timeout using AbortController
 */
export const fetchWithTimeout = async (
    url: string,
    options: RequestInit = {},
    timeout = 15000
): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

/**
 * Extract image URLs from markdown content
 * Matches pattern: exclamation bracket alt bracket open url bracket close
 */
export const extractImagesFromMarkdown = (markdown: string): string[] => {
    const imageRegex = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;
    const images: string[] = [];
    let match;
    while ((match = imageRegex.exec(markdown)) !== null) {
        images.push(match[1]);
    }
    return images;
};

/**
 * Split Threads-formatted text into body and comments sections.
 * Supports both marker-based ([[[COMMENTS_SECTION]]]) and legacy (Comments(N)) formats.
 */
export const splitThreadsSections = (raw: string): { body: string; comments: string[] } => {
    if (!raw) {
        return { body: '', comments: [] };
    }

    const marker = '[[[COMMENTS_SECTION]]]';
    const separator = '[[[COMMENT_SPLIT]]]';
    if (raw.includes(marker)) {
        const [body, commentsPart] = raw.split(marker);
        const comments = (commentsPart || '')
            .split(separator)
            .map(comment => comment.trim())
            .filter(Boolean);
        return {
            body: (body || '').trim(),
            comments
        };
    }

    const legacy = raw.match(/Comments?\s*\(\d+\)/i);
    if (!legacy) {
        return { body: raw.trim(), comments: [] };
    }

    const splitIndex = raw.indexOf(legacy[0]);
    const body = raw.slice(0, splitIndex).trim();
    const commentsRaw = raw.slice(splitIndex + legacy[0].length).trim();
    const comments = commentsRaw
        .split(/\n{2,}/)
        .map(comment => comment.trim())
        .filter(Boolean);
    return { body, comments };
};

/**
 * Rebuild Threads-formatted text from body and comments sections.
 */
export const buildThreadsSections = (body: string, comments: string[]): string => {
    const cleanedBody = (body || '').trim();
    const cleanedComments = comments.map(comment => comment.trim()).filter(Boolean);

    if (cleanedComments.length === 0) {
        return cleanedBody;
    }

    return [
        cleanedBody,
        '[[[COMMENTS_SECTION]]]',
        cleanedComments.join('\n\n[[[COMMENT_SPLIT]]]\n\n')
    ].join('\n\n');
};

/**
 * Check if text contains authentication gate patterns
 */
export const hasAuthGate = (text: string): boolean => {
    const lower = (text || '').toLowerCase();
    return lower.includes('log in') ||
        lower.includes('sign up') ||
        lower.includes('create an account') ||
        lower.includes('continue with instagram') ||
        lower.includes('로그인') ||
        lower.includes('회원가입');
};

/**
 * Select the better text between two extraction results.
 * Prefers longer, non-gated text.
 */
export const selectBetterText = (primary: string, secondary: string): string => {
    const first = primary || '';
    const second = secondary || '';
    if (!first) return second;
    if (!second) return first;

    const firstWeak = hasAuthGate(first) || first.length < 180;
    const secondWeak = hasAuthGate(second) || second.length < 180;

    if (firstWeak && !secondWeak) return second;
    if (!firstWeak && secondWeak) return first;

    return second.length > first.length ? second : first;
};

/**
 * Decode HTML entities (&#xHEX; and &#DEC; and &amp; etc.)
 */
const decodeHtmlEntities = (text: string): string => {
    return text
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&#064;/g, '@');
};

/**
 * Extract a meta tag content value from HTML head.
 */
const extractMeta = (head: string, property: string, attr = 'property'): string | null => {
    const re1 = new RegExp(`<meta[^>]*${attr}=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*${attr}=["']${property}["']`, 'i');
    const match = head.match(re1) || head.match(re2);
    return match?.[1] ? decodeHtmlEntities(match[1]) : null;
};

export interface OgMeta {
    title: string | null;
    description: string | null;
    image: string | null;
}

/**
 * Fetch OG metadata (title, description, image) from a URL's HTML head.
 * Lightweight fallback when content fetchers return weak results.
 * Uses Googlebot UA to get SEO-friendly meta tags from social media pages.
 */
export const fetchOgMeta = async (url: string): Promise<OgMeta> => {
    const empty: OgMeta = { title: null, description: null, image: null };
    try {
        const res = await fetchWithTimeout(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Accept': 'text/html',
            },
        }, 8000);
        if (!res.ok) return empty;

        const text = await res.text();
        const head = text.substring(0, 50000);

        const titleTagMatch = head.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title =
            extractMeta(head, 'og:title') ||
            extractMeta(head, 'twitter:title', 'name') ||
            (titleTagMatch?.[1] ? decodeHtmlEntities(titleTagMatch[1]) : null);

        const description =
            extractMeta(head, 'og:description') ||
            extractMeta(head, 'twitter:description', 'name') ||
            extractMeta(head, 'description', 'name');

        const image =
            extractMeta(head, 'og:image') ||
            extractMeta(head, 'twitter:image', 'name');

        return { title, description, image };
    } catch {
        return empty;
    }
};

/**
 * Fetch OG image from a URL by reading the HTML head section.
 * Lightweight fallback when content fetchers don't return images.
 */
export const fetchOgImage = async (url: string): Promise<string | null> => {
    const meta = await fetchOgMeta(url);
    return meta.image;
};

/**
 * Extract image URLs from raw HTML, targeting scontent CDN URLs.
 * Checks JSON-LD scripts and raw scontent patterns.
 * Excludes profile pictures (s150x150 etc.) and deduplicates.
 */
export const extractImagesFromHtml = (html: string): string[] => {
    const images = new Set<string>();

    // 1. JSON-LD <script> blocks — look for "image" fields
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let jsonLdMatch;
    while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
        try {
            const parsed = JSON.parse(jsonLdMatch[1]) as Record<string, unknown>;
            const extractFromObj = (obj: unknown): void => {
                if (!obj || typeof obj !== 'object') return;
                if (Array.isArray(obj)) {
                    for (const item of obj) extractFromObj(item);
                    return;
                }
                const record = obj as Record<string, unknown>;
                for (const [key, val] of Object.entries(record)) {
                    if ((key === 'image' || key === 'contentUrl' || key === 'thumbnailUrl') && typeof val === 'string') {
                        if (val.includes('scontent') && val.includes('cdninstagram.com')) {
                            images.add(val);
                        }
                    } else if (typeof val === 'object') {
                        extractFromObj(val);
                    }
                }
            };
            extractFromObj(parsed);
        } catch {
            // malformed JSON-LD, skip
        }
    }

    // 2. Raw scontent CDN URLs in HTML (src attributes, meta content, inline JSON)
    const scontentRegex = /https?:\/\/scontent[a-z0-9-]*\.cdninstagram\.com\/[^\s"'<>)]+/gi;
    let scontentMatch;
    while ((scontentMatch = scontentRegex.exec(html)) !== null) {
        images.add(scontentMatch[0]);
    }

    // 3. Filter out profile pictures (small thumbnails like s150x150, p150x150)
    const profilePicPattern = /[/]s\d{2,3}x\d{2,3}[/]|[/]p\d{2,3}x\d{2,3}[/]/;
    const filtered: string[] = [];
    for (const url of images) {
        if (profilePicPattern.test(url)) continue;
        filtered.push(url);
    }

    return filtered;
};
