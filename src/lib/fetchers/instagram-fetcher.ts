/**
 * Instagram Fetcher — Platform-specific fetcher for Instagram posts/reels
 *
 * Strategy chain:
 * 1. Jina Reader (best for public posts)
 * 2. Instagram oEmbed API (basic metadata fallback)
 */

import { validateUrl } from './url-validator';
import { fetchWithTimeout, extractImagesFromMarkdown, hasAuthGate } from './utils';
import type { FetchedUrlContent, PlatformFetcher } from './types';

/**
 * Remove Instagram comment blocks.
 * Each comment follows the pattern: username(+timestamp) → text → "View all N replies".
 * We detect "View all" markers and remove up to 2 preceding non-empty short lines per block.
 */
/** @internal Exported for testing */
export const removeInstagramComments = (text: string): string => {
  const lines = text.split('\n');
  const linesToRemove = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^(View all \d+ (replies|comments)|댓글 \d+개 모두 보기|답글 \d+개 보기)/i.test(trimmed)) {
      linesToRemove.add(i);
      // Remove up to 2 preceding non-empty lines (username + comment text)
      // Stop if a line is long (likely part of the caption, not a comment)
      let removed = 0;
      for (let j = i - 1; j >= 0 && removed < 2; j--) {
        const line = lines[j].trim();
        if (!line) continue;
        if (line.length > 80) break;
        linesToRemove.add(j);
        removed++;
      }
    }
  }

  if (linesToRemove.size === 0) return text;
  return lines.filter((_, i) => !linesToRemove.has(i)).join('\n');
};

/**
 * Clean Instagram-specific noise from Jina Reader content
 *
 * Phase 1: Section-level truncation (footer, related posts)
 * Phase 2: Comment block removal
 * Phase 3: Per-line pattern cleaning
 */
/** @internal Exported for testing */
export const cleanInstagramContent = (raw: string): string => {
  let cleaned = raw;

  // ── Phase 0: Strip markdown links → plain text ──
  // Must happen first so all subsequent phases match plain text patterns
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
  cleaned = cleaned.replace(/\[\]\([^)]+\)/g, '');
  cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1');
  cleaned = cleaned.replace(/^https?:\/\/[^\s]+$/gm, '');

  // ── Phase 1: Section-level truncation ──

  // Reel pages: truncate at first "username · Original audio" line.
  // Everything after this is other reels / comments from the same user.
  cleaned = cleaned.replace(/^[a-zA-Z0-9_.]+\s*[·•]\s*(Original audio|원본 오디오)[\s\S]*$/im, '');
  // Also handle standalone "Original audio" followed by engagement numbers
  cleaned = cleaned.replace(/^(Original audio|원본 오디오)\s*\n[\s\S]*$/im, '');

  // Remove "More posts from ..." and everything after (related posts)
  cleaned = cleaned.replace(/More posts from\s+\S+[\s\S]*$/im, '');

  // Remove "Log in to like or comment" and everything after
  cleaned = cleaned.replace(/Log in to like or comment\.?[\s\S]*$/im, '');

  // ── Phase 2: Comment block removal ──
  cleaned = removeInstagramComments(cleaned);

  // ── Phase 3: Per-line cleaning ──

  // Remove separator lines (=== or ---)
  cleaned = cleaned.replace(/^[=]{3,}\s*$/gm, '');
  cleaned = cleaned.replace(/^[-]{3,}\s*$/gm, '');

  // Remove Instagram login/signup prompts and login page elements
  cleaned = cleaned.replace(/Never miss a post from.*$/gim, '');
  cleaned = cleaned.replace(/Sign up for Instagram.*$/gim, '');
  cleaned = cleaned.replace(/Log in to like.*$/gim, '');
  cleaned = cleaned.replace(/Log in to see.*$/gim, '');
  cleaned = cleaned.replace(/stay in the loop\.?\s*$/gim, '');
  // Login form fields and privacy page sections (Jina sometimes returns these)
  cleaned = cleaned.replace(/^Mobile number, username or email\s*$/gim, '');
  cleaned = cleaned.replace(/^Contact Uploading & Non-Users\s*$/gim, '');
  cleaned = cleaned.replace(/^Password\s*$/gim, '');
  cleaned = cleaned.replace(/^\[x\]\s*$/gm, '');
  cleaned = cleaned.replace(/^Forgot password\??\s*$/gim, '');
  cleaned = cleaned.replace(/^Don't have an account\??\s*$/gim, '');
  cleaned = cleaned.replace(/^Get the app\.?\s*$/gim, '');

  // Remove username lists (e.g. "miro_kang tans_kr haeso_seongsu")
  cleaned = cleaned.replace(/^[\s*]*([a-zA-Z0-9_.]{2,30}\s+){2,}[a-zA-Z0-9_.]{2,30}\s*$/gm, '');

  // Remove post metadata: "username", "Edited•15w", "username•Follow", "•15w"
  cleaned = cleaned.replace(/^[a-zA-Z0-9_.]+\s*•\s*(Follow|팔로우)\s*$/gim, '');
  cleaned = cleaned.replace(/\bEdited\s*•\s*\d+[wdhms]\b/gi, '');
  cleaned = cleaned.replace(/^•\s*\d+[wdhms]\s*$/gm, '');
  cleaned = cleaned.replace(/^\d+[wdhms]\s*$/gm, '');

  // Remove standalone usernames (single word, looks like @handle, possibly with leading whitespace)
  cleaned = cleaned.replace(/^\s*[a-zA-Z_][a-zA-Z0-9_.]{2,29}\s*$/gm, (match) => {
    // Keep if it looks like a real sentence (has spaces and length > 30)
    return match.trim().includes(' ') ? match : '';
  });

  // Remove bullet-only lines
  cleaned = cleaned.replace(/^\s*[*•]\s*$/gm, '');
  cleaned = cleaned.replace(/^\s*\* \* \*\s*$/gm, '');

  // Remove Reel-specific UI elements
  cleaned = cleaned.replace(/^(Original audio|원본 오디오|Audio|Reels|릴스)\s*$/gim, '');
  // Remove "username · Original audio" pattern (reel attribution)
  cleaned = cleaned.replace(/^[a-zA-Z0-9_.]+\s*[·•]\s*(Original audio|원본 오디오)\s*$/gim, '');

  // Remove date lines (post timestamps)
  cleaned = cleaned.replace(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}\s*$/gim, '');
  cleaned = cleaned.replace(/^\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*$/gm, '');

  // Remove Instagram UI elements
  const uiPatterns = [
    /^(Log [Ii]n|Sign [Uu]p|Log in with Facebook|Create new account|Forgot password\??)\s*$/gim,
    /^(Like|Comment|Share|Save|Reply|Repost|Send|Follow|Following|Unfollow|More)\s*$/gim,
    /^(좋아요|댓글|공유|저장|답글|팔로우|팔로잉|더 보기)\s*$/gim,
    /^(Translate|번역 보기)\s*$/gim,
    /^(View all \d+ comments?|댓글 \d+개 모두 보기)\s*$/gim,
    /^(About|Help|Press|API|Jobs|Privacy|Terms|Locations|Language|Meta Verified)\s*$/gim,
    /^(소개|도움말|홍보 센터|API|채용 정보|개인정보처리방침|약관|위치|언어)\s*$/gim,
    /^Meta\s*$/gim,
    /^\d+\s*(likes?|좋아요)\s*$/gim,
    /^\d+\s*(comments?|댓글)\s*$/gim,
    /^\d+\s*(views?|조회)\s*$/gim,
    /^[\d,.]+[KkMm]?\s*(likes?|views?|followers?|following)?\s*$/gim,
    /^\d+\s*(시간|분|일|주|개월|년|hours?|minutes?|days?|weeks?|months?|years?)\s*(전|ago)\s*$/gim,
    /^Sorry, this page isn.t available\.?$/gim,
    /^The link you followed may be broken.*$/gim,
    /^(Instagram|© \d{4} Instagram from Meta)\s*$/gim,
  ];

  for (const pattern of uiPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
};

/**
 * Extract caption text from Instagram title/description metadata.
 * Jina returns titles like: 'Username on Instagram: "caption text"'
 * and descriptions like: '2,387 likes, 4,316 comments - username on ...: "caption text"'
 */
/** @internal Exported for testing */
export const extractCaptionFromMeta = (title?: string, description?: string): string => {
  // Try to extract quoted caption from title first (most complete)
  // Pattern: '... on Instagram: "caption"' or '... : "caption"'
  for (const source of [title, description]) {
    if (!source) continue;
    const quoteMatch = source.match(/:\s*"([^"]{10,})"\.?\s*$/);
    if (quoteMatch) return quoteMatch[1].trim();
    // Also try matching after the colon without quotes
    const colonMatch = source.match(/on Instagram:\s*(.{10,})$/);
    if (colonMatch) return colonMatch[1].replace(/^"|"\.?\s*$/g, '').trim();
  }
  return '';
};

/**
 * Extract author handle from Jina metadata or URL.
 *
 * Ported from v1 Puppeteer extractor — multiple extraction strategies:
 * 1. Description: "N likes, N comments - username on ..."
 * 2. Title: "DisplayName (@handle) ..."
 * 3. Title (Korean): "Instagram의 username님"
 * 4. Title (English): "username on Instagram: ..."
 * 5. URL: instagram.com/username/reel/...
 */
/** @internal Exported for testing */
export const extractAuthorFromMeta = (
  description?: string,
  title?: string,
  url?: string,
): { author?: string; authorHandle?: string } => {
  // Strategy 1: Description pattern "2,387 likes, 4,316 comments - pm_yoonchisang on ..."
  if (description) {
    const match = description.match(/comments?\s*-\s*([a-zA-Z0-9_.]+)\s+on\s/i);
    if (match) return { author: match[1], authorHandle: `@${match[1]}` };
  }

  if (title) {
    // Strategy 2: "DisplayName (@handle) • Instagram"
    const handleMatch = title.match(/\(@([a-zA-Z0-9_.]+)\)/);
    if (handleMatch) return { author: handleMatch[1], authorHandle: `@${handleMatch[1]}` };

    // Strategy 3 (Korean): "Instagram의 username님"
    const korMatch = title.match(/Instagram의\s*([^\s님:]+)님?/);
    if (korMatch) return { author: korMatch[1], authorHandle: `@${korMatch[1]}` };

    // Strategy 4 (English): "DisplayName on Instagram: ..."
    const engMatch = title.match(/^(.+?)\s+on\s+Instagram/i);
    if (engMatch) {
      // Title may have display name, not handle — still useful as author
      const name = engMatch[1].trim();
      if (name.length > 0 && name.length < 60) {
        return { author: name };
      }
    }
  }

  // Strategy 5: Extract from URL path (e.g. instagram.com/username/reel/...)
  if (url) {
    const urlMatch = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/(p|reel|reels|tv)\//i);
    if (urlMatch) return { author: urlMatch[1], authorHandle: `@${urlMatch[1]}` };
  }

  return {};
};

/**
 * Extract og:image or twitter:image from Jina metadata
 */
const extractOgImage = (metadata?: Record<string, unknown>): string | null => {
  if (!metadata) return null;
  const ogImage = metadata['og:image'] ?? metadata['twitter:image'];
  if (typeof ogImage === 'string' && ogImage.startsWith('http')) return ogImage;
  return null;
};

/**
 * Extract content using Jina Reader API
 */
const extractWithJina = async (url: string): Promise<FetchedUrlContent> => {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const jinaApiKey = process.env.JINA_API_KEY;

    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (jinaApiKey) headers['Authorization'] = `Bearer ${jinaApiKey}`;

    let response = await fetchWithTimeout(jinaUrl, { headers }, 20000);

    // Retry without API key if credits exhausted (402)
    if (response.status === 402 && jinaApiKey) {
      console.warn('[Instagram Fetcher/Jina] API key credits exhausted, retrying without key');
      const fallbackHeaders: Record<string, string> = { 'Accept': 'application/json' };
      response = await fetchWithTimeout(jinaUrl, { headers: fallbackHeaders }, 20000);
    }

    if (!response.ok) {
      console.warn(`[Instagram Fetcher/Jina] API returned ${response.status}`);
      return { rawText: '', images: [] };
    }

    const data = await response.json() as {
      data?: {
        content?: string;
        title?: string;
        description?: string;
        metadata?: Record<string, unknown>;
      };
      content?: string;
      title?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    };
    const structured = data.data ?? data;
    const rawContent = structured.content || '';
    const metadata = structured.metadata;

    // Instagram pages return login-wall content via Jina, but the actual caption
    // exists in both metadata AND buried in the page content (first reel block).
    // Strategy: clean content (truncated at first reel boundary) AND extract
    // metadata caption, then use the longer/better result.
    let images = extractImagesFromMarkdown(rawContent);

    // Try og:description from Jina metadata (ported from v1 Puppeteer strategy)
    const ogDesc = typeof metadata?.['og:description'] === 'string' ? metadata['og:description'] as string : undefined;
    const metaCaption = extractCaptionFromMeta(structured.title, structured.description ?? ogDesc);
    const contentCleaned = rawContent.length >= 20 ? cleanInstagramContent(rawContent) : '';

    // Prefer metadata when content looks like a login page (auth gate residual)
    let cleaned: string;
    if (contentCleaned && metaCaption) {
      const contentIsAuthGarbage = hasAuthGate(contentCleaned) || contentCleaned.length < 30;
      cleaned = contentIsAuthGarbage
        ? metaCaption
        : contentCleaned.length >= metaCaption.length ? contentCleaned : metaCaption;
    } else {
      cleaned = contentCleaned || metaCaption || '';
    }

    // Filter images — ported from v1 image-filter.ts
    // Remove blob URLs, low-quality thumbnails, profile pics, icons, and UI elements
    const BLOCKED_IMG_KEYWORDS = ['sprite', 'icon', 'favicon', 'emoji', 'badge', 'logo'];
    images = images.filter((u) => {
      if (u.startsWith('blob:')) return false;
      const lower = u.toLowerCase();
      // Size-based patterns (s150x150, p50x50, etc.)
      if (/[/_][sp]\d{2,3}x\d{2,3}[/_]/.test(lower)) return false;
      // Instagram profile pic path segment
      if (/t51\.2885-19/.test(lower)) return false;
      // File format exclusions
      if (lower.endsWith('.svg') || lower.endsWith('.ico') || lower.endsWith('.gif')) return false;
      // Keyword-based exclusions (profile pics, UI elements)
      if (BLOCKED_IMG_KEYWORDS.some((k) => lower.includes(k))) return false;
      return true;
    });

    // Extract og:image from metadata — primary thumbnail
    const ogImage = extractOgImage(metadata);
    if (ogImage && !images.includes(ogImage)) {
      images.unshift(ogImage);
    }

    // Deduplicate images
    images = [...new Set(images)];

    const authorInfo = extractAuthorFromMeta(structured.description, structured.title, url);

    return {
      rawText: cleaned,
      images,
      title: structured.title || undefined,
      description: structured.description || undefined,
      ...authorInfo,
    };
  } catch (error) {
    console.error('[Instagram Fetcher/Jina] Error:', error);
    return { rawText: '', images: [] };
  }
};

/**
 * Fetch basic metadata via Instagram oEmbed API
 */
const fetchInstagramOEmbed = async (url: string): Promise<FetchedUrlContent> => {
  try {
    const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${process.env.META_THREADS_APP_ID}|${process.env.META_THREADS_APP_SECRET}`;
    const response = await fetchWithTimeout(oembedUrl, {}, 10000);

    if (!response.ok) {
      console.warn(`[Instagram Fetcher/oEmbed] API returned ${response.status}`);
      return { rawText: '', images: [] };
    }

    const data = await response.json() as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };

    const parts: string[] = [];
    if (data.title) parts.push(data.title);

    return {
      rawText: parts.join('\n\n'),
      images: data.thumbnail_url ? [data.thumbnail_url] : [],
      author: data.author_name,
      authorHandle: data.author_name ? `@${data.author_name}` : undefined,
    };
  } catch (error) {
    console.error('[Instagram Fetcher/oEmbed] Error:', error);
    return { rawText: '', images: [] };
  }
};

export class InstagramFetcher implements PlatformFetcher {
  async fetch(url: string): Promise<FetchedUrlContent> {
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      console.error(`[Instagram Fetcher] SSRF blocked: ${urlValidation.error}`);
      return { rawText: '', images: [] };
    }

    try {
      // Strategy 1: Jina Reader
      const jinaResult = await extractWithJina(url);
      if (jinaResult.rawText && jinaResult.rawText.length > 50) {
        return jinaResult;
      }

      // Strategy 2: oEmbed API (requires Meta app credentials)
      if (process.env.META_THREADS_APP_ID && process.env.META_THREADS_APP_SECRET) {
        const oembedResult = await fetchInstagramOEmbed(url);
        if (oembedResult.rawText || oembedResult.images.length > 0) {
          return oembedResult;
        }
      }

      // Return whatever Jina got (even if weak)
      if (jinaResult.rawText || jinaResult.images.length > 0) {
        return jinaResult;
      }

      console.warn('[Instagram Fetcher] All strategies failed');
      return { rawText: '', images: [] };
    } catch (error) {
      console.error('[Instagram Fetcher] Error:', error);
      return { rawText: '', images: [] };
    }
  }
}
