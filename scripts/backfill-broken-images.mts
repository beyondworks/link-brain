/**
 * Backfill broken clip images (expired Instagram/Facebook signed URLs).
 *
 * Per clip:
 *   1. Original URL still alive → mirror it into Storage directly.
 *   2. Expired → re-fetch the page for fresh URLs, mirror those.
 *   3. Both failed → leave as-is, count it (no screenshot fallback here:
 *      microlink free tier is ~50/day and 1k+ clips would blow through it).
 *
 * Local-only (service role). Never deducts user credits — this path doesn't
 * touch process-clip. Run:  npx tsx scripts/backfill-broken-images.mts [limit]
 */

import { readFileSync } from 'node:fs';

for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const { supabaseAdmin } = await import('../src/lib/supabase/admin');
const { mirrorImageToStorage, isEphemeralImageUrl } = await import('../src/lib/services/image-mirror');
const { fetchUrlContent } = await import('../src/lib/fetchers/orchestrator');

const LIMIT = Number(process.argv[2] ?? '2000');
const db = supabaseAdmin;

const { data: clips, error } = await db
  .from('clips')
  .select('id, url, image, platform')
  .or('image.ilike.%cdninstagram%,image.ilike.%fbcdn%')
  .order('created_at', { ascending: false })
  .limit(LIMIT);
if (error) { console.error(error.message); process.exit(1); }

let mirroredDirect = 0, refetched = 0, failed = 0, galleryFixed = 0;

for (const [i, clip] of (clips ?? []).entries()) {
  let newImage: string | null = null;

  // 1. still-alive original → mirror directly
  newImage = await mirrorImageToStorage(clip.image as string, clip.id as string, 0);
  if (newImage) mirroredDirect++;

  // 2. expired → re-fetch the page for a fresh URL
  if (!newImage) {
    try {
      const content = await fetchUrlContent(clip.url as string);
      const fresh = (content.images ?? []).find((u: string) => u && !u.includes('profile'));
      if (fresh) {
        newImage = isEphemeralImageUrl(fresh)
          ? await mirrorImageToStorage(fresh, clip.id as string, 0)
          : fresh;
        if (newImage) refetched++;
      }
    } catch { /* counted below */ }
  }

  if (newImage) {
    await db.from('clips').update({ image: newImage }).eq('id', clip.id);

    // gallery URLs in content_markdown share the same expiry — swap thumbnail-known ones
    const { data: cc } = await db.from('clip_contents')
      .select('content_markdown').eq('clip_id', clip.id).single();
    const md: string | null = cc?.content_markdown ?? null;
    const gal = md?.match(/<!-- CLIP_GALLERY:([^>]*) -->/);
    if (md && gal && /cdninstagram|fbcdn/.test(gal[1])) {
      const urls = gal[1].split('|');
      const swapped = await Promise.all(urls.map(async (u: string, gi: number) =>
        /cdninstagram|fbcdn/.test(u)
          ? (await mirrorImageToStorage(u, clip.id as string, gi + 1)) ?? u
          : u
      ));
      if (swapped.join('|') !== gal[1]) {
        await db.from('clip_contents')
          .update({ content_markdown: md.replace(gal[0], `<!-- CLIP_GALLERY:${swapped.join('|')} -->`) })
          .eq('clip_id', clip.id);
        galleryFixed++;
      }
    }
  } else {
    failed++;
  }

  if ((i + 1) % 25 === 0 || i === (clips!.length - 1)) {
    console.log(`[${i + 1}/${clips!.length}] direct=${mirroredDirect} refetched=${refetched} failed=${failed} gallery=${galleryFixed}`);
  }
}

console.log('DONE', JSON.stringify({ mirroredDirect, refetched, failed, galleryFixed }));
