/**
 * Content Pattern Service — Collective Learning Pipeline
 *
 * Analyzes structural patterns from user clips (word count, headings,
 * paragraph count, intro patterns, keywords) and aggregates them
 * into the content_patterns table for content generation guidance.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;

const MIN_CONTENT_LENGTH = 50;
const MIN_SAMPLE_SIZE = 3;
const MAX_CLIPS = 2000;
const TOP_KEYWORDS_LIMIT = 10;

// ─── Intro Pattern Detection ────────────────────────────────────────────────

function analyzeIntroPattern(text: string): string {
  const firstParagraph = text.split(/\n\n/)[0] ?? '';
  if (firstParagraph.includes('?') || firstParagraph.endsWith('?')) return 'question';
  if (/\d+%|\d+개|\d+만/.test(firstParagraph)) return 'statistic';
  if (firstParagraph.length > 100) return 'story';
  return 'declaration';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

// ─── Main Aggregation ───────────────────────────────────────────────────────

export async function aggregateContentPatterns(): Promise<number> {
  const { data: clips } = await db
    .from('clips')
    .select('category_id, platform, title, keywords, clip_contents(content_markdown)')
    .not('clip_contents', 'is', null)
    .limit(MAX_CLIPS);

  if (!clips || clips.length === 0) return 0;

  // Resolve category names
  const { data: categories } = await db
    .from('categories')
    .select('id, name');

  const catMap = new Map(
    (categories ?? []).map((c: { id: string; name: string }) => [c.id, c.name.toLowerCase()])
  );

  // Group clips by category+platform
  type ClipItem = {
    title: string;
    content: string;
    keywords: string[];
    platform: string | null;
  };
  const groups = new Map<string, ClipItem[]>();

  for (const clip of clips as unknown[]) {
    const c = clip as Record<string, unknown>;
    const catName = catMap.get(c.category_id as string) ?? 'uncategorized';
    const platform = (c.platform as string) ?? null;

    const contents = c.clip_contents as
      | Array<{ content_markdown: string | null }>
      | { content_markdown: string | null }
      | null;
    const content = Array.isArray(contents)
      ? contents[0]?.content_markdown
      : (contents as { content_markdown: string | null } | null)?.content_markdown;

    if (!content || content.length < MIN_CONTENT_LENGTH) continue;

    const key = `${catName}|${platform ?? 'all'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({
      title: (c.title as string) ?? '',
      content,
      keywords: (c.keywords as string[]) ?? [],
      platform,
    });
  }

  // Analyze each group and upsert
  let upsertCount = 0;

  for (const [key, items] of groups) {
    if (items.length < MIN_SAMPLE_SIZE) continue;

    const [category, platform] = key.split('|');
    const charCounts = items.map((i) => i.content.length);
    const paragraphCounts = items.map((i) => i.content.split(/\n\n+/).length);
    const headingCounts = items.map((i) => (i.content.match(/^#{1,3}\s/gm) ?? []).length);
    const titleLengths = items.map((i) => i.title.length);
    const introTypes = items.map((i) => analyzeIntroPattern(i.content));

    // Intro pattern distribution
    const introCounts: Record<string, number> = {};
    for (const type of introTypes) {
      introCounts[type] = (introCounts[type] ?? 0) + 1;
    }
    const introPatterns: Record<string, number> = {};
    for (const [type, count] of Object.entries(introCounts)) {
      introPatterns[type] = Math.round((count / items.length) * 100) / 100;
    }

    // Top keywords by frequency
    const keywordCounts = new Map<string, number>();
    for (const item of items) {
      for (const kw of item.keywords) {
        keywordCounts.set(kw, (keywordCounts.get(kw) ?? 0) + 1);
      }
    }
    const topKeywords = [...keywordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_KEYWORDS_LIMIT)
      .map(([kw]) => kw);

    // content_patterns table not yet in generated types — cast to bypass
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.from as (t: string) => any)('content_patterns').upsert(
      {
        category,
        platform: platform === 'all' ? null : platform,
        sample_count: items.length,
        avg_char_count: avg(charCounts),
        avg_paragraph_count: avg(paragraphCounts),
        avg_heading_count: avg(headingCounts),
        avg_title_length: avg(titleLengths),
        intro_patterns: introPatterns,
        top_keywords: topKeywords,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'category,platform' }
    );

    upsertCount++;
  }

  return upsertCount;
}
