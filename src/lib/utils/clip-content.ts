/**
 * Shared content utilities for clip detail/peek views.
 *
 * Extracted from clip-detail-client.tsx and clip-peek-panel.tsx
 * to eliminate ~120 lines of duplicated logic.
 */
import type { ClipContent } from '@/types/database';

/** Check if image URL can be proxied through Next.js image optimization */
export function isProxiableImageUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return /\.supabase\.co$|^i\.ytimg\.com$|^img\.youtube\.com$|\.googleusercontent\.com$|\.cdninstagram\.com$|^pbs\.twimg\.com$|\.redd\.it$|^miro\.medium\.com$|^i\.pinimg\.com$|^opengraph\.githubassets\.com$|^media\.licdn\.com$|\.pstatic\.net$|^images\.unsplash\.com$/.test(hostname);
  } catch {
    return false;
  }
}

/** Extract YouTube video ID from various URL formats */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/** Extract all images from clip content markdown + main image */
export function extractImagesFromContent(
  clipContents?: ClipContent[],
  mainImage?: string | null,
): string[] {
  const images: string[] = [];
  if (mainImage) images.push(mainImage);
  if (clipContents?.length) {
    const text = clipContents[0]?.content_markdown ?? clipContents[0]?.raw_markdown ?? '';
    // 1. Markdown images: ![alt](url)
    const mdPattern = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match;
    while ((match = mdPattern.exec(text)) !== null) {
      if (match[1] && !images.includes(match[1])) images.push(match[1]);
    }
    // 2. CLIP_GALLERY HTML comment (multi-image from fetcher pipeline)
    const galleryMatch = text.match(/<!-- CLIP_GALLERY:(.+?) -->/);
    if (galleryMatch?.[1]) {
      for (const imgUrl of galleryMatch[1].split('|')) {
        const trimmed = imgUrl.trim();
        if (trimmed && !images.includes(trimmed)) images.push(trimmed);
      }
    }
  }
  return images;
}

/** Strip metadata artifacts from display content */
export function cleanDisplayContent(text: string): string {
  let t = text;
  // Remove CLIP_GALLERY HTML comments
  t = t.replace(/<!--\s*CLIP_GALLERY:[^>]*-->/g, '');
  // Remove markdown images (shown in image slideshow above)
  t = t.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
  // Remove standalone "-Author" / "·Author" / "- Author" lines
  t = t.replace(/^[-·]\s*Author\s*$/gm, '');
  // Remove lines that are just "Author"
  t = t.replace(/^\s*Author\s*$/gm, '');
  // Collapse excessive blank lines
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

/** Collapse whitespace for fuzzy prefix comparison */
const normalize = (s: string) => s.replace(/\s+/g, '').slice(0, 120);

/** Strip Jina Reader footer garbage */
const stripJinaFooter = (s: string) =>
  s.replace(/\n*(?:Continue with (?:Instagram|Threads|Facebook)[\s\S]*)?(?:\n\*\s*©\s*\d{4}[\s\S]*)?(?:\n\*\s*Report a problem\s*)?$/, '').trim();

/** Split content into body and optional sub-content (comments, etc.) */
export function splitContentSections(text: string): { body: string; subContent: string | null } {
  // 1. Threads marker-based separator (from fetcher pipeline)
  const commentsMarker = '[[[COMMENTS_SECTION]]]';
  if (text.includes(commentsMarker)) {
    const [bodyPart, subPart] = text.split(commentsMarker);
    const body = stripJinaFooter(bodyPart.trim());
    const sub = stripJinaFooter((subPart ?? '').replace(/\[\[\[COMMENT_SPLIT\]\]\]/g, '\n\n---\n\n').trim());
    if (body && sub) return { body, subContent: sub };
    if (body) return { body, subContent: null };
  }

  // 2. Jina Reader ======= separator (Threads/social content)
  const eqMatch = text.match(/\n={3,}\n/);
  if (eqMatch && eqMatch.index != null) {
    const partA = text.slice(0, eqMatch.index).trim();
    const partB = stripJinaFooter(text.slice(eqMatch.index + eqMatch[0].length).trim());
    if (partA && partB) {
      const normA = normalize(partA);
      const normB = normalize(partB);
      if (normB.startsWith(normA.slice(0, 60)) || normA.startsWith(normB.slice(0, 60))) {
        const cleaned = partB.replace(/\n·Author\n/g, '\n');
        return { body: cleaned, subContent: null };
      }
      return { body: partA, subContent: partB };
    }
  }

  // 3. Horizontal rule separator (---)
  const hrMatch = text.match(/\n-{3,}\n/);
  if (hrMatch && hrMatch.index != null) {
    const body = text.slice(0, hrMatch.index).trim();
    const sub = stripJinaFooter(text.slice(hrMatch.index + hrMatch[0].length).trim());
    if (body && sub) return { body, subContent: sub };
  }

  // 4. Heading-based separators
  const headingPattern = /\n##\s+(?:Comments|댓글|Replies|답글|Sub-?[Cc]ontents?|관련\s*댓글)/i;
  const headingMatch = text.match(headingPattern);
  if (headingMatch && headingMatch.index != null) {
    const body = text.slice(0, headingMatch.index).trim();
    const sub = stripJinaFooter(text.slice(headingMatch.index + headingMatch[0].length).trim());
    if (body && sub) return { body, subContent: sub };
  }

  // 5–6. Paragraph-based heuristics
  const paras = text.split(/\n{2,}/);

  // 5. Social media comment signatures (e.g., "username · 2d", "handle · 2025-12-03")
  if (paras.length >= 3) {
    const sigRe = /^@?[a-zA-Z0-9_][\w.]{0,29}\s+[·•]\s+\S/;
    let firstCommentIdx = -1;
    let sigCount = 0;
    for (let i = 0; i < paras.length; i++) {
      const firstLine = paras[i].trim().split('\n')[0];
      if (sigRe.test(firstLine)) {
        sigCount++;
        if (firstCommentIdx === -1) firstCommentIdx = i;
      }
    }
    if (sigCount >= 2 && firstCommentIdx > 0) {
      const bodyPart = paras.slice(0, firstCommentIdx).join('\n\n').trim();
      const commentPart = paras.slice(firstCommentIdx).map((p) => p.trim()).filter(Boolean).join('\n\n---\n\n');
      if (bodyPart && commentPart) return { body: stripJinaFooter(bodyPart), subContent: commentPart };
    }
  }

  // 6. Trailing short reaction paragraphs (display-time comment heuristic)
  // If the last substantive paragraph (≥60 chars) is followed by 2+ short paragraphs (<60 chars),
  // split them as comments. This catches social media replies not caught by normalizer markers.
  if (paras.length >= 3) {
    let lastSubstantiveIdx = -1;
    for (let i = 0; i < paras.length; i++) {
      if (paras[i].trim().length >= 60) {
        lastSubstantiveIdx = i;
      }
    }
    if (lastSubstantiveIdx >= 0 && lastSubstantiveIdx < paras.length - 1) {
      const trailing = paras.slice(lastSubstantiveIdx + 1);
      const allShort = trailing.every((p) => p.trim().length < 60);
      if (allShort && trailing.length >= 2) {
        const body = stripJinaFooter(paras.slice(0, lastSubstantiveIdx + 1).join('\n\n'));
        const sub = trailing.map((p) => p.trim()).filter(Boolean).join('\n\n---\n\n');
        if (body && sub) return { body, subContent: sub };
      }
    }
  }

  return { body: stripJinaFooter(text), subContent: null };
}
