/**
 * URL Transforms — pure, throw-free URL rewriters and extractors.
 *
 * Ported from insane-search's URL-mutation strategies (mobile/AMP/old-reddit
 * variants) plus tweet/reddit id extractors. Every function returns the
 * original url (or null for extractors) on non-matching input and never throws.
 */

/** Parse a URL, returning null instead of throwing on malformed input. */
const tryParse = (url: string): URL | null => {
    try {
        return new URL(url);
    } catch {
        return null;
    }
};

/**
 * Rewrite host to its mobile variant: www.host → m.host, or prepend m. when
 * there is no www. Already-mobile (m.) hosts are returned unchanged.
 */
export const toMobileUrl = (url: string): string => {
    const parsed = tryParse(url);
    if (!parsed) return url;

    const host = parsed.hostname;
    if (host.startsWith('m.')) return url;

    if (host.startsWith('www.')) {
        parsed.hostname = `m.${host.slice(4)}`;
    } else {
        parsed.hostname = `m.${host}`;
    }
    return parsed.toString();
};

/**
 * Naive AMP variant: append an `amp/` path segment (before any query string).
 * Kept intentionally simple — this is a best-effort alternate URL to try.
 */
export const toAmpUrl = (url: string): string => {
    const parsed = tryParse(url);
    if (!parsed) return url;

    const path = parsed.pathname;
    parsed.pathname = path.endsWith('/') ? `${path}amp/` : `${path}/amp`;
    return parsed.toString();
};

/** Remove a leading www. from the host. Non-www hosts are unchanged. */
export const dropWww = (url: string): string => {
    const parsed = tryParse(url);
    if (!parsed) return url;
    if (parsed.hostname.startsWith('www.')) {
        parsed.hostname = parsed.hostname.slice(4);
    }
    return parsed.toString();
};

/** Rewrite a reddit.com URL to old.reddit.com. Non-reddit URLs are unchanged. */
export const toOldRedditUrl = (url: string): string => {
    const parsed = tryParse(url);
    if (!parsed) return url;

    const host = parsed.hostname;
    if (host === 'reddit.com' || host === 'www.reddit.com') {
        parsed.hostname = 'old.reddit.com';
        return parsed.toString();
    }
    return url;
};

/**
 * Convert a Naver Blog URL to its mobile (m.blog.naver.com) form.
 * Replicates naver-fetcher's convertToNaverMobile; non-blog URLs pass through.
 */
export const toNaverMobileUrl = (url: string): string => {
    if (url.includes('m.blog.naver.com')) {
        return url;
    }
    return url.replace('blog.naver.com', 'm.blog.naver.com');
};

/**
 * Extract the numeric tweet id from an x.com / twitter.com status URL.
 * Handles query strings and trailing paths. Returns null when no id is found.
 */
export const extractTweetId = (url: string): string | null => {
    const match = url.match(/(?:^|\/\/|\.)(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d+)/i);
    return match ? match[1] : null;
};

export interface RedditPostRef {
    subreddit: string;
    postId: string;
}

/**
 * Extract {subreddit, postId} from a /r/{sub}/comments/{id}/... URL.
 * Returns null when the URL is not a reddit comments permalink.
 */
export const extractRedditPost = (url: string): RedditPostRef | null => {
    const match = url.match(/\/r\/([^/]+)\/comments\/([a-z0-9]+)/i);
    if (!match) return null;
    return { subreddit: match[1], postId: match[2] };
};
