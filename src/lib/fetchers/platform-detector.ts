/**
 * Platform Detector — Single canonical implementation
 *
 * Handles redirect URLs (l.threads.net, t.co) and short domains (instagr.am, youtu.be)
 */

export const detectPlatform = (url: string, sourceHint?: string): string => {
    if (sourceHint) return sourceHint;

    const urlLower = url.toLowerCase();

    // Threads (including www and redirects)
    if (urlLower.includes('threads.net') ||
        urlLower.includes('threads.com') ||
        urlLower.includes('www.threads') ||
        urlLower.includes('l.threads.net')) return 'threads';

    // Instagram (including short domain)
    if (urlLower.includes('instagram.com') || urlLower.includes('instagr.am')) return 'instagram';

    // YouTube
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';

    // X/Twitter (including t.co redirects)
    // Note: use hostname check for t.co to avoid false positives (e.g. pinterest.com, reddit.com contain "t.co" as substring)
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
    try {
        const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
        if (hostname === 't.co') return 'twitter';
    } catch {
        // invalid URL — skip t.co check
    }

    // Pinterest
    if (urlLower.includes('pinterest.com')) return 'pinterest';

    // GitHub
    if (urlLower.includes('github.com') || urlLower.includes('gist.github.com')) return 'github';

    // Reddit
    if (urlLower.includes('reddit.com') || urlLower.includes('redd.it')) return 'reddit';

    // LinkedIn
    if (urlLower.includes('linkedin.com') || urlLower.includes('lnkd.in')) return 'linkedin';

    // Medium (including custom domains is hard, but catch the main domain)
    if (urlLower.includes('medium.com') || urlLower.includes('towardsdatascience.com')) return 'medium';

    // Substack
    if (urlLower.includes('substack.com')) return 'substack';

    // TikTok
    if (urlLower.includes('tiktok.com') || urlLower.includes('vm.tiktok.com')) return 'tiktok';

    // Naver Blog
    if (urlLower.includes('blog.naver.com') || urlLower.includes('m.blog.naver.com')) return 'naver';

    return 'web';
};
