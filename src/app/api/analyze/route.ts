/**
 * API - URL Analysis
 *
 * POST /api/analyze - Analyze a URL and return clip metadata
 *
 * Authenticates via API key or Supabase session.
 * Returns clip metadata compatible with the frontend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, handleCorsPreflightResponse } from '@/lib/api/cors';
import { validateApiKey } from '@/lib/api/api-key-auth';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { detectPlatform } from '@/lib/fetchers/platform-detector';

interface AnalyzeBody {
  url: string;
  language?: string;
  userId?: string;
}

/**
 * Validate URL for SSRF prevention
 */
function isPrivateHostname(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    hostname === 'metadata.google.internal'
  ) return true;
  // RFC 1918: 10.0.0.0/8
  if (hostname.startsWith('10.')) return true;
  // RFC 1918: 192.168.0.0/16
  if (hostname.startsWith('192.168.')) return true;
  // RFC 1918: 172.16.0.0/12 (172.16.* ~ 172.31.*)
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) return true;
  // AWS IMDS / link-local
  if (hostname.startsWith('169.254.')) return true;
  return false;
}

function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP/HTTPS URLs are supported' };
    }
    if (isPrivateHostname(parsed.hostname.toLowerCase())) {
      return { valid: false, error: 'Private/internal URLs are not allowed' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
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

    // Validate URL
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

    console.log(`[Analyze] Processing: ${url} for user: ${userId}`);

    // Fetch page metadata using Jina Reader (no Puppeteer dependency in v2)
    let title = url;
    let summary = '';
    const author = '';
    const image: string | null = null;
    let platform = 'web';
    let htmlContent = '';

    try {
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
      const jinaRes = await fetch(jinaUrl, {
        headers: {
          Accept: 'application/json',
          'X-Return-Format': 'markdown',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (jinaRes.ok) {
        const jinaData = (await jinaRes.json()) as {
          data?: {
            title?: string;
            description?: string;
            content?: string;
            url?: string;
          };
        };
        title = jinaData.data?.title ?? url;
        summary = jinaData.data?.description ?? '';
        htmlContent = jinaData.data?.content ?? '';
      }
    } catch (fetchErr) {
      console.warn('[Analyze] Jina fetch failed:', fetchErr);
      // Continue with URL-only clip
    }

    // Detect platform from URL (canonical single implementation)
    platform = detectPlatform(url);

    const clip = {
      url,
      title,
      summary,
      author,
      image,
      platform,
      language,
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
