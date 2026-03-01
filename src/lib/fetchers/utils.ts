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
