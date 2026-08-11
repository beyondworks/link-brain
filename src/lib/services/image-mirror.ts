/**
 * Image mirroring — copy ephemeral CDN images into our own Storage.
 *
 * Instagram/Facebook CDN URLs are signed and expire within days; storing them
 * directly leaves clips with permanently broken thumbnails (403 → next/image
 * 502). Mirroring the bytes into the public `clip-uploads` bucket makes the
 * saved URL permanent.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

/** Hosts whose image URLs are signed and expire. Stable CDNs are not mirrored. */
const EPHEMERAL_HOST_PATTERNS = [/\.cdninstagram\.com$/i, /\.fbcdn\.net$/i];

const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const isEphemeralImageUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname;
    return EPHEMERAL_HOST_PATTERNS.some((p) => p.test(host));
  } catch {
    return false;
  }
};

/**
 * Download one image and store it under clip-uploads/mirror/{clipId}/.
 * Returns the permanent public URL, or null on any failure (caller keeps the
 * original URL — mirroring is best-effort).
 */
export const mirrorImageToStorage = async (
  imageUrl: string,
  clipId: string,
  index = 0
): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkbrainBot/1.0)' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    const ext = EXT_BY_TYPE[type];
    if (!ext) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;

    const path = `mirror/${clipId}/${index}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from('clip-uploads')
      .upload(path, buf, { contentType: type, upsert: true });
    if (error) {
      console.warn(`[ImageMirror] upload failed (${path}):`, error.message);
      return null;
    }

    return supabaseAdmin.storage.from('clip-uploads').getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.warn(`[ImageMirror] mirror failed for clip ${clipId}:`, err);
    return null;
  }
};

/**
 * Mirror every ephemeral URL in the list (stable URLs pass through untouched).
 * Returns the list with mirrored replacements, preserving order.
 */
export const mirrorEphemeralImages = async (
  urls: string[],
  clipId: string
): Promise<string[]> => {
  return Promise.all(
    urls.map(async (u, i) => {
      if (!isEphemeralImageUrl(u)) return u;
      return (await mirrorImageToStorage(u, clipId, i)) ?? u;
    })
  );
};
