/**
 * Threads Graph API Client
 *
 * Wraps the Threads API for fetching post data including
 * carousel images, video thumbnails, and text content.
 */

import type { FetchedUrlContent } from '@/lib/fetchers/types';

const THREADS_API_BASE = 'https://graph.threads.net/v1.0';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ThreadsMediaFields {
  id: string;
  text?: string;
  media_type: 'TEXT_POST' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REPOST_FACADE';
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
  username?: string;
  children?: { data: Array<{ id: string }> };
}

interface ThreadsChildMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO';
  media_url?: string;
  thumbnail_url?: string;
}

interface ThreadsUserProfile {
  id: string;
  username: string;
}

// ─── API Calls ──────────────────────────────────────────────────────────────

async function threadsGet<T>(path: string, token: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${THREADS_API_BASE}${path}`);
  url.searchParams.set('access_token', token);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Threads API ${path} failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Get current user's profile.
 */
export async function getThreadsProfile(token: string): Promise<ThreadsUserProfile> {
  return threadsGet<ThreadsUserProfile>('/me', token, {
    fields: 'id,username',
  });
}

/**
 * Fetch a single media post by ID.
 * Exported for potential direct ID-based lookups.
 */
export async function getMediaById(mediaId: string, token: string): Promise<ThreadsMediaFields> {
  return threadsGet<ThreadsMediaFields>(`/${mediaId}`, token, {
    fields: 'id,text,media_type,media_url,permalink,thumbnail_url,timestamp,username,children',
  });
}

/**
 * Fetch carousel children media.
 */
async function getCarouselChildren(mediaId: string, token: string): Promise<ThreadsChildMedia[]> {
  const result = await threadsGet<{ data: ThreadsChildMedia[] }>(
    `/${mediaId}/children`,
    token,
    { fields: 'id,media_type,media_url,thumbnail_url' },
  );
  return result.data ?? [];
}

/**
 * Find a media post by URL permalink.
 * Searches recent posts from the authenticated user.
 */
async function findMediaByPermalink(
  permalink: string,
  token: string,
): Promise<ThreadsMediaFields | null> {
  // Fetch user's recent posts (up to 50)
  const result = await threadsGet<{ data: ThreadsMediaFields[] }>(
    '/me/threads',
    token,
    { fields: 'id,text,media_type,media_url,permalink,thumbnail_url,timestamp,username,children', limit: '50' },
  );

  if (!result.data) return null;

  // Normalize URLs for comparison
  const normalizeUrl = (u: string) =>
    u.replace(/^https?:\/\//, '').replace(/\/$/, '').replace('www.', '');

  const target = normalizeUrl(permalink);
  return result.data.find((m) => m.permalink && normalizeUrl(m.permalink) === target) ?? null;
}

// ─── Main Extraction ────────────────────────────────────────────────────────

/**
 * Extract content from a Threads post using the official API.
 * Returns FetchedUrlContent with images, video thumbnails, and text.
 *
 * Limitation: Only works for the authenticated user's own posts.
 * Returns null if the post is not found (caller should fall back to Jina).
 */
export async function extractWithThreadsAPI(
  url: string,
  token: string,
): Promise<FetchedUrlContent | null> {
  try {
    // Try to find the post by permalink
    const media = await findMediaByPermalink(url, token);
    if (!media) return null;

    const images: string[] = [];
    let videoUrl: string | undefined;

    switch (media.media_type) {
      case 'IMAGE':
        if (media.media_url) images.push(media.media_url);
        break;

      case 'VIDEO':
        // Use thumbnail for display, store video URL for potential future use
        if (media.thumbnail_url) images.push(media.thumbnail_url);
        videoUrl = media.media_url;
        break;

      case 'CAROUSEL_ALBUM': {
        // Fetch all children to get every image/video in the carousel
        if (media.children?.data) {
          const children = await getCarouselChildren(media.id, token);
          for (const child of children) {
            if (child.media_type === 'IMAGE' && child.media_url) {
              images.push(child.media_url);
            } else if (child.media_type === 'VIDEO') {
              // Use thumbnail for video items in carousel
              if (child.thumbnail_url) images.push(child.thumbnail_url);
            }
          }
        }
        break;
      }

      case 'TEXT_POST':
        // No media, just text
        break;

      case 'REPOST_FACADE':
        // Repost — limited data available
        break;
    }

    const text = media.text ?? '';
    const author = media.username ?? '';

    return {
      rawText: text,
      images,
      author,
      authorHandle: author ? `@${author}` : undefined,
      finalUrl: media.permalink ?? url,
      title: text.length > 80 ? `${text.slice(0, 77)}...` : text || undefined,
      description: text || undefined,
      // Store video URL in embedded links for potential future use
      embeddedLinks: videoUrl
        ? [{ label: 'Video', url: videoUrl }]
        : undefined,
    };
  } catch (err) {
    console.error('[ThreadsAPI] Extraction failed:', err);
    return null;
  }
}
