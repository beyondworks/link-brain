/**
 * POST /api/v1/clips/retry
 *
 * Public endpoint for retrying failed clip processing.
 * Authenticated via withAuth middleware — validates clip ownership.
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, sendError, ErrorCodes, errors } from '@/lib/api/response';

const db = supabaseAdmin;

async function handleRetry(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  let body: { clipId: string };
  try {
    body = await req.json() as { clipId: string };
  } catch {
    return sendError(ErrorCodes.INVALID_REQUEST, 'Invalid JSON body', 400);
  }

  const { clipId } = body;
  if (!clipId) {
    return sendError(ErrorCodes.INVALID_REQUEST, 'clipId is required', 400);
  }

  // Verify ownership
  const { data: clip, error: fetchError } = await db
    .from('clips')
    .select('id, url, platform, source_type, user_id, processing_status')
    .eq('id', clipId)
    .eq('user_id', auth.publicUserId)
    .single();

  if (fetchError || !clip) {
    return sendError(ErrorCodes.CLIP_NOT_FOUND, 'Clip not found', 404);
  }

  const typedClip = clip as { id: string; url: string; platform: string; source_type: string | null; user_id: string; processing_status: string };

  if (typedClip.processing_status === 'processing') {
    return sendError(ErrorCodes.INVALID_REQUEST, 'Clip is already being processed', 400);
  }

  // If clip was already processed (ready), delete existing content for fresh reprocessing
  if (typedClip.processing_status === 'ready') {
    await db.from('clip_contents').delete().eq('clip_id', clipId);
  }

  // Reset to pending
  await db
    .from('clips')
    .update({ processing_status: 'pending', processing_error: null })
    .eq('id', clipId);

  // Fire-and-forget: trigger background processing
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const isImageClip = typedClip.source_type === 'image_upload' || typedClip.platform === 'image';

  after(async () => {
    try {
      if (isImageClip) {
        // Image clips: get storage path from clip_images table
        const { data: imgRow } = await db
          .from('clip_images')
          .select('storage_path')
          .eq('clip_id', typedClip.id)
          .single();
        const storagePath = (imgRow as { storage_path: string } | null)?.storage_path;
        if (!storagePath) {
          console.error(`[Retry] No storage_path found for image clip ${clipId}`);
          return;
        }
        await fetch(`${baseUrl}/api/internal/process-image-clip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(internalSecret ? { 'x-internal-secret': internalSecret } : {}),
          },
          body: JSON.stringify({
            clipId: typedClip.id,
            storagePath,
            userId: typedClip.user_id,
          }),
        });
      } else {
        await fetch(`${baseUrl}/api/internal/process-clip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(internalSecret ? { 'x-internal-secret': internalSecret } : {}),
          },
          body: JSON.stringify({
            clipId: typedClip.id,
            url: typedClip.url,
            platform: typedClip.platform,
            userId: typedClip.user_id,
          }),
        });
      }
    } catch (err) {
      console.error(`[Retry] Background trigger failed for ${clipId}:`, err);
    }
  });

  return sendSuccess({ clipId, status: 'retrying' });
}

const routeHandler = withAuth(
  async (req, auth) => {
    if (req.method === 'POST') return handleRetry(req, auth);
    return errors.methodNotAllowed(['POST']);
  },
  { allowedMethods: ['POST'] }
);

export const POST = routeHandler;
export const OPTIONS = routeHandler;
