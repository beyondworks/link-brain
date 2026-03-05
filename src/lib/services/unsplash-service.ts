/**
 * Unsplash Image Fallback Service
 *
 * When a clip has no content images, fetch a topic-related photo
 * from Unsplash using the AI-generated keywords.
 *
 * Free tier: 50 req/hr (demo), 5000 req/hr (production).
 * Requires UNSPLASH_ACCESS_KEY env var.
 */

const UNSPLASH_BASE = 'https://api.unsplash.com';

export async function fetchTopicImage(keywords: string[]): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey || keywords.length === 0) return null;

  const query = keywords.slice(0, 3).join(' ');

  try {
    const res = await fetch(
      `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) {
      console.warn(`[Unsplash] Search failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const photo = data.results?.[0];
    if (!photo?.urls) return null;

    // regular = 1080px wide, good balance of quality and size
    return photo.urls.regular ?? photo.urls.small ?? null;
  } catch (err) {
    console.warn('[Unsplash] Fetch error:', err);
    return null;
  }
}
