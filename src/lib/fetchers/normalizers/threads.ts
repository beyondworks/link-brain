/**
 * Threads Text Normalizer (Version 5 - Major Cleanup)
 *
 * Comprehensive text cleaning for Threads content:
 * - Image markdown completely removed (![...](url))
 * - Markdown links cleaned ([label](url) → label or removed)
 * - JSON/prompt blocks removed
 * - Paragraph deduplication
 * - Structured output with [[[COMMENTS_SECTION]]] / [[[COMMENT_SPLIT]]] markers
 */

// ============================================================================
// STEP 1: Core cleaning functions
// ============================================================================

function removeImageMarkdown(text: string): string {
    let t = text.replace(/!\[[\s\S]*?\]\([\s\S]*?\)/g, '');
    t = t.replace(/\[\[?Image\s*\d*:?[^\]]*\]\]?/gi, '');
    t = t.replace(/^https?:\/\/scontent[^\s]+$/gm, '');
    t = t.replace(/^https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)[^\s]*$/gim, '');
    return t;
}

function cleanMarkdownLinks(text: string): string {
    const t = text.replace(/\[([^\]]*?)\]\((https?:\/\/[^)]*?)\)/g, (_match, label, url) => {
        const cleanLabel = (label || '').trim();
        const urlLower = (url || '').toLowerCase();

        if (!cleanLabel) return '';
        if (/^링크$/i.test(cleanLabel)) return '';
        if (/^link$/i.test(cleanLabel)) return '';
        if (/^Log in$/i.test(cleanLabel)) return '';
        if (/^로그인$/i.test(cleanLabel)) return '';
        if (/^Read more$/i.test(cleanLabel)) return '';
        if (/^Learn more$/i.test(cleanLabel)) return '';
        if (/^더 보기$/i.test(cleanLabel)) return '';
        if (/^Thread\s*={3,}/i.test(cleanLabel)) return '';
        if (/^\d+\/\d+\/\d+$/i.test(cleanLabel)) return '';
        if (/^@?\w+$/i.test(cleanLabel) && cleanLabel.length < 20) return '';

        if (urlLower.includes('threads.net') || urlLower.includes('threads.com')) return '';
        if (urlLower.includes('instagram.com') || urlLower.includes('facebook.com')) return '';
        if (urlLower.includes('fbcdn.net') || urlLower.includes('cdninstagram.com')) return '';
        if (urlLower.includes('/login') || urlLower.includes('/accounts/')) return '';

        if (url && url.startsWith('http')) {
            return `[${cleanLabel}](${url})`;
        }

        return cleanLabel;
    });

    return t;
}

function removeGarbageTokens(text: string): string {
    let t = text;

    t = t.replace(/\[\s*\]/g, '');
    t = t.replace(/\(\s*\)/g, '');
    t = t.replace(/\[링크\]/gi, '');
    t = t.replace(/^\]\(https?:\/\/[^)]+\)$/gm, '');
    t = t.replace(/\]\(https?:\/\/[^\s)]+/g, '');
    t = t.replace(/https?:\/\/scontent[^\s]+/g, '');
    t = t.replace(/https?:\/\/[^\s]+\.cdninstagram\.com[^\s]*/g, '');
    t = t.replace(/https?:\/\/[^\s]+\.fbcdn\.net[^\s]*/g, '');
    t = t.replace(/^https?:\/\/(?:www\.)?threads\.(?:net|com)[^\s]*$/gm, '');
    t = t.replace(/^https?:\/\/(?:www\.)?instagram\.com[^\s]*$/gm, '');
    t = t.replace(/^https?:\/\/(?:www\.)?facebook\.com[^\s]*$/gm, '');
    t = t.replace(/^https?:\/\/l\.threads\.net[^\s]*$/gm, '');

    return t;
}

function removeJsonPromptBlocks(text: string): string {
    const paragraphs = text
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(Boolean);

    const cleaned: string[] = [];

    for (const p of paragraphs) {
        if (p.includes('"style_mode"')) continue;
        if (p.includes('"negative_prompt"')) continue;
        if (p.includes('"prompt"') && p.includes('"style"')) continue;
        if (p.includes('"render_intent"')) continue;
        if (p.includes('"aesthetic_controls"')) continue;

        const isJsonLike = p.length > 200 &&
            p.includes('{') &&
            p.includes('":') &&
            (p.match(/"/g) || []).length > 10;
        if (isJsonLike) continue;

        if (p.startsWith('{{') || p.startsWith('[{')) continue;

        cleaned.push(p);
    }

    return cleaned.join('\n\n');
}

function removeMetadata(text: string): string {
    let t = text;

    t = t.replace(/^Translate\s*$/gm, '');
    t = t.replace(/Thread\s*[-=]{3,}.*$/gm, '');
    t = t.replace(/Thread\s*[-=]{3,}\s*[\d.]+K?\s*views?/gi, '');
    t = t.replace(/\[Thread\s*[-=]{3,}[^\]]*\]/gi, '');
    t = t.replace(/^·?-?Author$/gm, '');
    t = t.replace(/^Pinned$/gm, '');
    t = t.replace(/^Report a problem.*$/gm, '');
    t = t.replace(/^Related threads.*$/gm, '');
    t = t.replace(/^Log in to see.*$/gm, '');
    t = t.replace(/^View all \d+ replies.*$/gm, '');
    t = t.replace(/^No photo description available.*$/gm, '');
    t = t.replace(/^May be an image of.*$/gm, '');
    t = t.replace(/^May be a.*image.*$/gm, '');
    t = t.replace(/^profile picture.*$/gm, '');
    t = t.replace(/^Sorry, we're having trouble.*$/gm, '');
    t = t.replace(/^Log in or sign up.*$/gim, '');
    t = t.replace(/^Log in with username.*$/gim, '');
    t = t.replace(/^Log in with Instagram.*$/gim, '');
    t = t.replace(/^See what people are talking about.*$/gim, '');
    t = t.replace(/^join the conversation.*$/gim, '');
    t = t.replace(/^Create an account.*$/gim, '');
    t = t.replace(/^Sign up.*$/gim, '');
    t = t.replace(/^Forgot password.*$/gim, '');
    t = t.replace(/^Threads Terms.*$/gim, '');
    t = t.replace(/^Privacy Policy.*$/gim, '');
    t = t.replace(/^Cookies Policy.*$/gim, '');
    t = t.replace(/^More from @\w+.*$/gim, '');
    t = t.replace(/^Suggested for you.*$/gim, '');
    t = t.replace(/^Download the app.*$/gim, '');
    t = t.replace(/^Get the app.*$/gim, '');
    t = t.replace(/^Verified$/gim, '');

    return t;
}

function deduplicateParagraphs(text: string): string {
    const paragraphs = text
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(Boolean);

    const seen = new Set<string>();
    const deduped: string[] = [];

    for (const p of paragraphs) {
        const key = p.replace(/\s+/g, ' ').trim().toLowerCase();
        if (!key) continue;
        if (key.length < 3) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(p);
    }

    return deduped.join('\n\n');
}

/**
 * Clean individual lines.
 * BUG FIX B1: Only strip internal/CDN URLs, preserve external hyperlinks.
 */
function cleanLine(line: string): string {
    let t = line.trim();
    t = t.replace(/https?:\/\/(?:scontent[^\s]*|[^\s]*\.fbcdn\.net[^\s]*|[^\s]*\.cdninstagram\.com[^\s]*|(?:www\.)?threads\.(?:net|com)[^\s]*|(?:www\.)?instagram\.com[^\s]*|(?:www\.)?facebook\.com[^\s]*|l\.threads\.net[^\s]*)/gi, '');
    t = t.replace(/\s{2,}/g, ' ').trim();
    return t;
}

function isNoiseLine(line: string): boolean {
    const t = line.trim();

    if (!t) return true;
    if (t.length < 2) return true;
    if (/^\d+$/.test(t) && t.length <= 4) return true;
    if (/^\d+\.?\d*[KM]?$/.test(t) && t.length <= 5) return true;
    if (/^[!?.,]+$/.test(t)) return true;
    if (/^\[링크\]$/.test(t)) return true;
    if (/^\[\s*\]$/.test(t)) return true;
    if (/ig_cache_key/i.test(t)) return true;
    if (/^(Reply|Like|Repost|Share|Verified|Follow|Following)$/i.test(t)) return true;
    if (/^\d+[dhms]$/i.test(t)) return true;
    if (/^\d+\s*(likes?|replies?|reposts?|views?)$/i.test(t)) return true;
    if (/^(View|See)\s+(all\s+)?\d+\s+replies?/i.test(t)) return true;
    if (/^(More from|Suggested for you|Related threads)/i.test(t)) return true;
    if (/^profile picture$/i.test(t)) return true;
    if (t.length < 10 && /^[ㅋㅎㄷㅜㅠㅡ\s!?😊😂🤣😭😍🥰👍👏🔥💯😲🙂❤️💕🥺😤😳🫠🤗💪🙏✨⭐️🎉🥹]+$/u.test(t)) return true;

    return false;
}

// ============================================================================
// STEP 2: Main normalizer function
// ============================================================================

export interface NormalizeThreadsOptions {
    authorHandle?: string;
    authorOnlyChain?: boolean;
}

const parseTaggedComment = (comment: string): { handle: string; text: string } => {
    const tagged = comment.match(/^\[@([a-zA-Z0-9_.]+)\]\s*([\s\S]*)$/);
    if (!tagged) {
        return { handle: '', text: comment };
    }
    return {
        handle: tagged[1].trim().toLowerCase(),
        text: (tagged[2] || '').trim()
    };
};

/**
 * Detect and split comments from body text when no Comments(N) marker exists.
 *
 * Strategy 1: `@?username · timestamp` pattern (Jina structured output)
 * Strategy 2: Trailing short reaction paragraphs after substantive body
 *
 * Safety: requires at least 2 comment signatures; cancels if body < 50 chars.
 */
export function detectAndSplitComments(
    text: string,
    authorHandle: string
): { body: string; commentsRaw: string } {
    const author = authorHandle.replace(/^@/, '').trim().toLowerCase();
    const paragraphs = text.split(/\n{2,}/);

    // Strategy 1: "username · time" or "@username · time" (Jina common format)
    const commentSigRegex = /^@?([a-zA-Z0-9_.]+)\s*·\s*(\d{4}-\d{2}-\d{2}|\d+[dhmsw]|[\d]+월\s*[\d]+일|[A-Z][a-z]{2}\s+\d{1,2})/;

    let firstCommentIdx = -1;
    let sigCount = 0;
    let authorSigCount = 0;

    for (let i = 0; i < paragraphs.length; i++) {
        const line = paragraphs[i].trim();
        const match = line.match(commentSigRegex);
        if (!match) continue;

        const handle = match[1].toLowerCase();
        if (author && handle === author) {
            authorSigCount++;
            continue;
        }

        sigCount++;
        if (firstCommentIdx === -1) firstCommentIdx = i;
    }

    if (sigCount >= 2 && firstCommentIdx !== -1) {
        // Separate author follow-ups from comments after the split point
        const bodyParas = paragraphs.slice(0, firstCommentIdx);
        const authorFollowUps: string[] = [];
        const commentParas: string[] = [];
        let currentOwner: 'author' | 'comment' = 'comment';

        for (let i = firstCommentIdx; i < paragraphs.length; i++) {
            const line = paragraphs[i].trim();
            const match = line.match(commentSigRegex);
            if (match) {
                const handle = match[1].toLowerCase();
                if (author && handle === author) {
                    currentOwner = 'author';
                    authorFollowUps.push(paragraphs[i]);
                } else {
                    currentOwner = 'comment';
                    commentParas.push(paragraphs[i]);
                }
            } else {
                // No signature — belongs to whoever spoke last
                if (currentOwner === 'author') {
                    authorFollowUps.push(paragraphs[i]);
                } else {
                    commentParas.push(paragraphs[i]);
                }
            }
        }

        const body = [...bodyParas, ...authorFollowUps].join('\n\n').trim();
        const commentsRaw = commentParas.join('\n\n').trim();
        if (body.length >= 50) {
            return { body, commentsRaw };
        }
    }

    // Skip Strategy 2 if we found signatures that all belong to the author —
    // trailing short paragraphs are likely author's own thread continuation.
    if (authorSigCount > 0 && sigCount === 0) {
        return { body: text, commentsRaw: '' };
    }

    // Strategy 2: Trailing short reaction paragraphs
    // Find the last "substantive" paragraph (>= 40 chars), then check if
    // everything after it is short (< 40 chars) and looks like reactions.
    if (paragraphs.length >= 3) {
        let lastSubstantiveIdx = -1;
        for (let i = 0; i < paragraphs.length; i++) {
            if (paragraphs[i].trim().length >= 40) {
                lastSubstantiveIdx = i;
            }
        }

        if (lastSubstantiveIdx >= 0 && lastSubstantiveIdx < paragraphs.length - 1) {
            const trailing = paragraphs.slice(lastSubstantiveIdx + 1);
            const allShort = trailing.every(p => p.trim().length < 40);
            if (allShort && trailing.length >= 2) {
                const body = paragraphs.slice(0, lastSubstantiveIdx + 1).join('\n\n').trim();
                const commentsRaw = trailing.join('\n\n').trim();
                if (body.length >= 50) {
                    return { body, commentsRaw };
                }
            }
        }
    }

    return { body: text, commentsRaw: '' };
}

export function normalizeThreads(raw: string, options: NormalizeThreadsOptions = {}): string {
    if (!raw) return '';

    let text = raw;
    const authorHandle = options.authorHandle?.replace(/^@/, '').trim().toLowerCase() || '';
    const authorOnlyChain = !!options.authorOnlyChain;

    text = removeImageMarkdown(text);
    text = cleanMarkdownLinks(text);
    text = removeGarbageTokens(text);
    text = removeJsonPromptBlocks(text);
    text = removeMetadata(text);
    text = deduplicateParagraphs(text);

    // Try marker-based split first, then pattern-based detection
    const hasMarker = /Comments?\s*\(\d+\)/i.test(text);
    let bodyRaw: string;
    let commentsRaw: string;

    if (hasMarker) {
        const parts = text.split(/Comments?\s*\(\d+\)/i);
        bodyRaw = parts[0] || '';
        commentsRaw = parts[1] || '';
    } else {
        const detected = detectAndSplitComments(text, authorHandle);
        bodyRaw = detected.body;
        commentsRaw = detected.commentsRaw;
    }

    const bodyLines = bodyRaw
        .split('\n')
        .map(cleanLine)
        .filter(l => !isNoiseLine(l));

    const commentLines = commentsRaw
        .split(/\n{2,}/)
        .map(cleanLine)
        .filter(l => !isNoiseLine(l))
        .map(parseTaggedComment)
        .filter(({ handle, text: commentText }) => {
            if (!commentText || isNoiseLine(commentText)) return false;
            if (authorOnlyChain && authorHandle) {
                if (handle.length > 0) {
                    return handle === authorHandle;
                }
                return commentText.length > 30;
            }
            return true;
        })
        .map(({ text: commentText }) => commentText);

    const seenBody = new Set<string>();
    const dedupedBody: string[] = [];
    for (const line of bodyLines) {
        const key = line.replace(/\s+/g, ' ').trim().toLowerCase();
        if (seenBody.has(key)) continue;
        seenBody.add(key);
        dedupedBody.push(line);
    }

    const finalBody = dedupedBody.join('\n\n');

    if (commentLines.length === 0) {
        return finalBody;
    }

    const commentsWithMarkers = commentLines.join('\n\n[[[COMMENT_SPLIT]]]\n\n');

    return [
        finalBody,
        '[[[COMMENTS_SECTION]]]',
        commentsWithMarkers,
    ].join('\n\n');
}

export default normalizeThreads;
