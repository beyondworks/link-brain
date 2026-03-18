/**
 * Screenshot Fallback Service
 *
 * When a clip has no content or OG images, capture a screenshot
 * of the actual webpage using Microlink API.
 *
 * Free tier: 50 req/day (~1,500/month).
 * No API key required for free tier.
 */

const MICROLINK_BASE = 'https://api.microlink.io';

export async function fetchScreenshot(url: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      url,
      screenshot: 'true',
      'screenshot.type': 'jpeg',
      'screenshot.quality': '75',
      'screenshot.width': '1280',
      'screenshot.height': '720',
      meta: 'false',
      embed: 'screenshot.url',
    });

    const res = await fetch(`${MICROLINK_BASE}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[Screenshot] Microlink failed: ${res.status}`);
      return null;
    }

    // With embed=screenshot.url, Microlink redirects to the image URL directly
    // The final URL after redirect is the screenshot
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.startsWith('image/')) {
      return res.url;
    }

    // Fallback: parse JSON response
    const data = await res.json();
    const screenshotUrl = data?.data?.screenshot?.url ?? null;
    return screenshotUrl;
  } catch (err) {
    console.warn('[Screenshot] Fetch error:', err);
    return null;
  }
}
