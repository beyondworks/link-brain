/**
 * Social post body extraction.
 *
 * Scraped social pages (Threads/Instagram/X) carry the author's OTHER posts,
 * other users' comments, and login-wall chrome mixed into the body. Regex
 * cleaning can't tell those apart from the real post — they look identical.
 *
 * So the AI picks paragraphs BY INDEX, and we rebuild the body from our own
 * array. The model never returns prose, only numbers, which makes fabrication
 * structurally impossible: every output character came from the source.
 */

/** Platforms whose scraped pages mix in foreign content. */
const SOCIAL_PLATFORMS = new Set(['threads', 'instagram', 'twitter', 'pinterest']);

export const isSocialPlatform = (platform: string): boolean =>
  SOCIAL_PLATFORMS.has(platform.toLowerCase());

/** Paragraphs long enough to be worth judging. Index = position in this array. */
export const splitParagraphsForExtraction = (rawText: string, maxChars = 8000): string[] => {
  const out: string[] = [];
  let used = 0;
  for (const p of rawText.split(/\n{2,}/)) {
    const t = p.trim();
    if (!t) continue;
    if (used + t.length > maxChars) break;
    used += t.length;
    out.push(t);
  }
  return out;
};

/** Render numbered paragraphs for the prompt. */
export const numberParagraphs = (paragraphs: string[]): string =>
  paragraphs.map((p, i) => `[${i}] ${p}`).join('\n\n');

export interface SocialSelection {
  keepLines?: number[];
  authorFollowUpLines?: number[];
}

const pickValid = (idx: number[] | undefined, total: number): number[] =>
  (idx ?? [])
    .filter((n) => Number.isInteger(n) && n >= 0 && n < total)
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .sort((a, b) => a - b);

/**
 * Rebuild the post body from selected indices.
 * Returns null when the selection is unusable, so callers keep the original.
 */
export const rebuildSocialBody = (
  paragraphs: string[],
  selection: SocialSelection
): string | null => {
  let body = pickValid(selection.keepLines, paragraphs.length);
  if (body.length === 0) return null;

  // The real post is one contiguous block at the top of the page; anything the
  // model kept after a gap ≥2 is almost always a look-alike later post. A gap
  // of exactly 1 is allowed (a skipped noise line inside the body).
  const cut = body.findIndex((n, i) => i > 0 && n - body[i - 1] > 2);
  if (cut > 0) body = body.slice(0, cut);

  const followUps = pickValid(selection.authorFollowUpLines, paragraphs.length)
    .filter((n) => !body.includes(n));

  const bodyText = body.map((i) => paragraphs[i]).join('\n\n');
  if (followUps.length === 0) return bodyText;

  // Same markers the UI already splits on (see lib/utils/clip-content.ts).
  return [
    bodyText,
    '[[[COMMENTS_SECTION]]]',
    followUps.map((i) => paragraphs[i]).join('\n\n[[[COMMENT_SPLIT]]]\n\n'),
  ].join('\n\n');
};
