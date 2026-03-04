/**
 * API - URL Analysis (Preview)
 *
 * POST /api/analyze - Analyze a URL and return rich preview metadata
 *
 * Authenticates via API key or Supabase session.
 * Uses the fetcher orchestrator for platform-specific content extraction.
 * Falls back to URL-based metadata when content extraction fails.
 */

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, handleCorsPreflightResponse } from '@/lib/api/cors';
import { validateApiKey } from '@/lib/api/api-key-auth';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchUrlContent } from '@/lib/fetchers/orchestrator';
import { detectPlatform } from '@/lib/fetchers/platform-detector';
import { validateUrl } from '@/lib/fetchers/url-validator';
import { hasAuthGate } from '@/lib/fetchers/utils';
import { PLATFORM_LABELS_EN } from '@/config/constants';

/**
 * Extract author handle from social media URL patterns.
 */
function extractAuthorFromUrl(url: string, platform: string): { author: string; authorHandle: string } {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    if (platform === 'threads' || platform === 'instagram') {
      // /threads.net/@username/post/xxx or /instagram.com/p/xxx
      const match = pathname.match(/^\/@?([^/]+)/);
      if (match) {
        const handle = match[1];
        return { author: handle, authorHandle: `@${handle}` };
      }
    }

    if (platform === 'twitter') {
      // /twitter.com/username/status/xxx or /x.com/username/status/xxx
      const match = pathname.match(/^\/([^/]+)/);
      if (match && !['search', 'explore', 'home', 'i', 'settings'].includes(match[1])) {
        const handle = match[1];
        return { author: handle, authorHandle: `@${handle}` };
      }
    }

    if (platform === 'youtube') {
      const match = pathname.match(/^\/@([^/]+)/);
      if (match) {
        return { author: match[1], authorHandle: `@${match[1]}` };
      }
    }
  } catch {
    // Invalid URL
  }
  return { author: '', authorHandle: '' };
}

/**
 * Generate fallback title/summary from URL when content extraction fails.
 */
function generateUrlFallbackMeta(url: string, platform: string, authorHandle: string): { title: string; summary: string } {
  const platformLabel = PLATFORM_LABELS_EN[platform] || '';
  const authorSuffix = authorHandle ? ` by ${authorHandle}` : '';

  let title: string;
  if (platformLabel) {
    title = `${platformLabel} post${authorSuffix}`;
  } else {
    try {
      title = new URL(url).hostname.replace('www.', '');
    } catch {
      title = 'Saved Link';
    }
  }

  const SOCIAL_PLATFORMS = ['threads', 'instagram', 'twitter', 'tiktok', 'pinterest'];
  let summary: string;
  if (SOCIAL_PLATFORMS.includes(platform)) {
    summary = `${platformLabel} 포스트입니다. 저장하면 AI가 자동으로 분석합니다.`;
  } else if (platformLabel) {
    summary = `${platformLabel} 링크입니다. 저장하면 AI가 자동으로 분석합니다.`;
  } else {
    summary = '저장하면 AI가 자동으로 분석합니다.';
  }

  return { title, summary };
}

interface AnalyzeBody {
  url: string;
  language?: string;
  userId?: string;
}

/**
 * Attempt to resolve userId from request (API key or session).
 */
async function resolveUserId(req: NextRequest): Promise<string | null> {
  // 1. API key
  const apiKey = req.headers.get('x-api-key');
  if (apiKey) {
    return validateApiKey(apiKey);
  }

  // 2. Bearer token
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    return user?.id ?? null;
  }

  // 3. Cookie session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflightResponse(req.headers.get('origin')) as NextResponse;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  const withCors = (res: NextResponse) => {
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  };

  try {
    let body: AnalyzeBody;
    try {
      body = (await req.json()) as AnalyzeBody;
    } catch {
      return withCors(
        NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
      );
    }

    const { url, language = 'KR' } = body;

    // Validate URL (SSRF prevention via shared validator)
    const urlCheck = validateUrl(url);
    if (!urlCheck.valid) {
      return withCors(
        NextResponse.json({ error: urlCheck.error }, { status: 400 })
      );
    }

    // Authenticate
    const userId = await resolveUserId(req);
    if (!userId) {
      return withCors(
        NextResponse.json(
          { error: 'Authentication required. Provide X-API-Key or Bearer token.' },
          { status: 401 }
        )
      );
    }

    // Detect platform
    const platform = detectPlatform(url);

    // Fetch content using the orchestrator (platform-specific fetchers)
    let title = url;
    let summary = '';
    let author = '';
    let authorHandle = '';
    let authorAvatar = '';
    let image: string | null = null;
    let images: string[] = [];
    let htmlContent = '';
    let rawText = '';

    try {
      const content = await fetchUrlContent(url);

      rawText = content.rawText ?? '';
      htmlContent = content.htmlContent ?? '';
      images = content.images ?? [];
      image = images[0] ?? null;
      author = content.author ?? '';
      authorHandle = content.authorHandle ?? '';
      authorAvatar = content.authorAvatar ?? '';

      // Auth gate detection — don't use login wall text for metadata
      const isAuthGate = hasAuthGate(rawText);

      // Prefer Jina structured title/description when available
      if (content.title) {
        title = content.title.substring(0, 200);
      } else if (rawText && !isAuthGate) {
        const firstLine = rawText.split('\n').find((l) => l.trim().length > 0);
        if (firstLine) {
          title = firstLine.replace(/^#+\s*/, '').trim().substring(0, 200);
        }
      }

      if (content.description) {
        summary = content.description.substring(0, 300);
      } else if (rawText && !isAuthGate) {
        const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
        const summaryLine = lines.find(
          (l, i) => i > 0 && !l.startsWith('#') && !l.startsWith('![') && l.length > 20
        );
        if (summaryLine) {
          summary = summaryLine.trim().substring(0, 300);
        }
      }

      // Clear auth gate content from rawText to prevent it leaking into saved data
      if (isAuthGate && rawText.length < 500) {
        rawText = '';
      }
    } catch (fetchErr) {
      console.warn('[Analyze] Orchestrator fetch failed:', fetchErr);
    }

    // Fallback: when content extraction returned nothing useful, generate from URL
    if (title === url || !title) {
      const urlAuthor = extractAuthorFromUrl(url, platform);
      if (!author) author = urlAuthor.author;
      if (!authorHandle) authorHandle = urlAuthor.authorHandle;

      const fallback = generateUrlFallbackMeta(url, platform, authorHandle);
      title = fallback.title;
      if (!summary) {
        summary = fallback.summary;
      }
    }

    const clip = {
      url,
      title,
      summary,
      author,
      authorHandle,
      authorAvatar,
      image,
      images,
      platform,
      language,
      rawText: rawText.substring(0, 100000),
      htmlContent: htmlContent.substring(0, 100000),
    };

    return withCors(NextResponse.json(clip, { status: 201 }));
  } catch (error) {
    console.error('[Analyze] Error:', error);
    return withCors(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    );
  }
}
