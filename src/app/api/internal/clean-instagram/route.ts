/**
 * Internal API: Clean existing Instagram clip_contents raw_markdown
 *
 * POST /api/internal/clean-instagram
 *
 * Applies cleanInstagramContent to all Instagram clips that still have noisy content.
 * One-time migration endpoint — safe to run multiple times (idempotent).
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cleanInstagramContent } from '@/lib/fetchers/instagram-fetcher';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function POST() {
  const { data: clips, error } = await db
    .from('clips')
    .select('id')
    .eq('platform', 'instagram');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!clips || clips.length === 0) {
    return NextResponse.json({ message: 'No Instagram clips found', updated: 0 });
  }

  let updated = 0;

  for (const clip of clips) {
    const { data: content } = await db
      .from('clip_contents')
      .select('raw_markdown, content_markdown')
      .eq('clip_id', clip.id)
      .single();

    if (!content?.raw_markdown) continue;

    const cleanedRaw = cleanInstagramContent(content.raw_markdown);
    const cleanedDisplay = content.content_markdown
      ? cleanInstagramContent(content.content_markdown)
      : cleanedRaw;

    // Skip if already clean
    if (cleanedRaw === content.raw_markdown) continue;

    const { error: updateError } = await db
      .from('clip_contents')
      .update({
        raw_markdown: cleanedRaw,
        content_markdown: cleanedDisplay,
      })
      .eq('clip_id', clip.id);

    if (!updateError) updated++;
  }

  return NextResponse.json({ message: `Cleaned ${updated} Instagram clips`, updated });
}
