/**
 * API v1 - Screenshot Save
 *
 * POST /api/v1/screenshot-save
 *
 * Captures a screenshot of a URL (or accepts an imageUrl directly),
 * runs GPT-4o-mini vision to extract URLs from the screenshot,
 * and optionally auto-saves extracted URLs as clips.
 *
 * Body:
 *   { url?: string, imageUrl?: string, autoSave?: boolean }
 *
 * - url: webpage to screenshot via Microlink → then extract URLs
 * - imageUrl: existing image URL → extract URLs directly
 * - autoSave: if true, save each extracted URL as a clip (status: pending)
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, sendError, errors, ErrorCodes } from '@/lib/api/response';
import { fetchScreenshot } from '@/lib/services/screenshot-service';
import { extractUrlsFromScreenshot } from '@/lib/ocr/vision-parser';
import { validateUrl } from '@/lib/fetchers/url-validator';
import { deductCredits } from '@/lib/services/plan-service';
import { checkClipLimit } from '@/lib/services/plan-service';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { detectPlatform } from '@/lib/fetchers/platform-detector';
import { resolveDbPlatform } from '@/lib/services/clip-service';

export const maxDuration = 60;

const db = supabaseAdmin;

interface ScreenshotSaveBody {
  url?: string;
  imageUrl?: string;
  autoSave?: boolean;
}

async function handleScreenshotSave(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  let body: ScreenshotSaveBody;
  try {
    body = (await req.json()) as ScreenshotSaveBody;
  } catch {
    return sendError(ErrorCodes.INVALID_REQUEST, 'Invalid JSON body', 400);
  }

  const { url, imageUrl, autoSave = false } = body;

  if (!url && !imageUrl) {
    return sendError(ErrorCodes.INVALID_REQUEST, 'url 또는 imageUrl 중 하나가 필요합니다.', 400);
  }

  // Validate the input URL to prevent SSRF
  if (url) {
    const validation = validateUrl(url);
    if (!validation.valid) {
      return sendError(ErrorCodes.INVALID_REQUEST, `Invalid URL: ${validation.error}`, 400);
    }
  }

  if (imageUrl) {
    const validation = validateUrl(imageUrl);
    if (!validation.valid) {
      return sendError(ErrorCodes.INVALID_REQUEST, `Invalid imageUrl: ${validation.error}`, 400);
    }
  }

  // Deduct AI credits (1 credit, same cost as AI_SUMMARY)
  const creditCheck = await deductCredits(auth.publicUserId, 'AI_SUMMARY');
  if (!creditCheck.allowed) {
    return errors.insufficientCredits(
      1,
      Math.max(0, (creditCheck.limit ?? 0) - (creditCheck.used ?? 0))
    );
  }

  // Step 1: Resolve the image to analyse
  let targetImageUrl: string;

  if (imageUrl) {
    targetImageUrl = imageUrl;
  } else {
    // Capture screenshot via Microlink
    const screenshotUrl = await fetchScreenshot(url!);
    if (!screenshotUrl) {
      return sendError(
        ErrorCodes.INTERNAL_ERROR,
        'URL의 스크린샷을 캡처할 수 없습니다.',
        502
      );
    }
    targetImageUrl = screenshotUrl;
  }

  // Step 2: Extract URLs via GPT-4o-mini vision
  let extraction;
  try {
    extraction = await extractUrlsFromScreenshot(targetImageUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Vision API 오류';
    console.error('[ScreenshotSave] Vision extraction failed:', err);
    return sendError(ErrorCodes.INTERNAL_ERROR, message, 500);
  }

  // Step 3: Auto-save extracted URLs as clips if requested
  const savedClipIds: string[] = [];

  if (autoSave && extraction.urls.length > 0) {
    const clipLimit = await checkClipLimit(auth.publicUserId);
    if (!clipLimit.allowed) {
      return errors.planLimitReached('clip', clipLimit.used ?? 0, clipLimit.limit ?? 0);
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const internalSecret = process.env.INTERNAL_API_SECRET;

    for (const extracted of extraction.urls) {
      // Validate each extracted URL before saving
      const validation = validateUrl(extracted.url);
      if (!validation.valid) continue;

      // Deduplicate: skip if already saved
      const { data: existing } = await db
        .from('clips')
        .select('id')
        .eq('user_id', auth.publicUserId)
        .eq('url', extracted.url)
        .single();

      if (existing) continue;

      const detectedPlatform = detectPlatform(extracted.url);
      const platform = resolveDbPlatform(detectedPlatform, detectedPlatform);

      const { data: clipRow, error: insertError } = await db
        .from('clips')
        .insert({
          user_id: auth.publicUserId,
          url: extracted.url,
          title: extracted.context || null,
          platform,
          is_favorite: false,
          is_read_later: false,
          is_archived: false,
          is_public: false,
          views: 0,
          likes_count: 0,
          processing_status: 'pending',
        })
        .select('id')
        .single();

      if (insertError || !clipRow) {
        console.error('[ScreenshotSave] Clip insert error:', insertError);
        continue;
      }

      const clipId = (clipRow as { id: string }).id;
      savedClipIds.push(clipId);

      // Fire-and-forget background processing
      if (baseUrl && internalSecret) {
        const capturedClipId = clipId;
        const capturedUrl = extracted.url;
        after(async () => {
          try {
            await fetch(`${baseUrl}/api/internal/process-clip`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': internalSecret,
              },
              body: JSON.stringify({
                clipId: capturedClipId,
                url: capturedUrl,
                platform: detectedPlatform,
                userId: auth.publicUserId,
              }),
            });
          } catch (err) {
            console.error('[ScreenshotSave] Background processing trigger failed:', err);
          }
        });
      }
    }
  }

  return sendSuccess({
    screenshotUrl: targetImageUrl,
    extraction,
    autoSave,
    savedClips: savedClipIds.length,
    savedClipIds,
  });
}

export const POST = withAuth(handleScreenshotSave, {
  allowedMethods: ['POST'],
  isAiEndpoint: true,
});
