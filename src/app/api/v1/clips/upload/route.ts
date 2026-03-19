/**
 * API v1 - Clips Upload (Image)
 *
 * POST /api/v1/clips/upload - Create clip from uploaded image
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, errors } from '@/lib/api/response';
import { validateBody } from '@/lib/api/validate';
import { z } from 'zod';

// Supabase typed client cast to escape strict insert/update generics
const db = supabaseAdmin;

// Validation schema for upload
const uploadClipSchema = z.object({
  storagePath: z.string().min(1, 'Storage path is required'),
  originalFilename: z.string().optional(),
  title: z.string().optional(),
  collectionIds: z.array(z.string()).optional(),
});

export const maxDuration = 30;

async function handleUpload(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const bodyResult = await validateBody(req, uploadClipSchema);
  if (!bodyResult.ok) return bodyResult.response;

  const { storagePath, originalFilename, title, collectionIds } = bodyResult.value;

  try {
    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('clip-uploads')
      .getPublicUrl(storagePath);

    // Create clip row with pending status
    // url = public URL of the image (since image clips don't have a source URL)
    // platform = 'image', source_type = 'image_upload'
    const { data: clipRow, error: insertError } = await db
      .from('clips')
      .insert({
        user_id: auth.publicUserId,
        url: publicUrl,
        title: title || originalFilename || 'Image Upload',
        platform: 'image',
        source_type: 'image_upload',
        is_favorite: false,
        is_read_later: false,
        is_archived: false,
        is_public: false,
        views: 0,
        likes_count: 0,
        processing_status: 'pending',
      })
      .select('*')
      .single();

    if (insertError || !clipRow) {
      console.error('[Upload API] Insert clip error:', insertError);
      return errors.internalError();
    }

    const clipId = (clipRow as { id: string }).id;

    // Create clip_images row
    const { error: imageError } = await db
      .from('clip_images')
      .insert({
        clip_id: clipId,
        storage_path: storagePath,
        public_url: publicUrl,
        original_filename: originalFilename || null,
      });

    if (imageError) {
      console.error('[Upload API] Insert clip_images error:', imageError);
    }

    // Handle collection assignments
    if (collectionIds && collectionIds.length > 0) {
      const joinRows = collectionIds.map((cid: string) => ({
        clip_id: clipId,
        collection_id: cid,
      }));
      await db.from('clip_collections').insert(joinRows);
    }

    // Trigger background processing
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const internalSecret = process.env.INTERNAL_API_SECRET;

    if (baseUrl && internalSecret) {
      after(async () => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 55_000);
          const res = await fetch(`${baseUrl}/api/internal/process-image-clip`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': internalSecret,
            },
            body: JSON.stringify({
              clipId,
              storagePath,
              userId: auth.publicUserId,
            }),
          });
          clearTimeout(timeout);
          if (!res.ok) {
            console.error(`[Upload API] Background processing failed: ${res.status} ${await res.text().catch(() => '')}`);
          }
        } catch (err) {
          console.error('[Upload API] Background processing trigger failed:', err);
          // Mark clip as failed so user sees error instead of infinite pending
          try {
            await db
              .from('clips')
              .update({
                processing_status: 'failed',
                processing_error: 'Background processing failed to start',
              })
              .eq('id', clipId);
          } catch { /* best effort */ }
        }
      });
    } else {
      console.error('[Upload API] Missing NEXT_PUBLIC_APP_URL or INTERNAL_API_SECRET — skipping background processing');
      await db.from('clips').update({
        processing_status: 'failed',
        processing_error: 'Server configuration missing for image processing',
      }).eq('id', clipId);
    }

    // Return immediately with pending clip
    return sendSuccess({
      id: clipId,
      url: publicUrl,
      title: title || originalFilename || 'Image Upload',
      platform: 'image',
      sourceType: 'image_upload',
      processingStatus: 'pending',
      storagePath,
      createdAt: (clipRow as Record<string, unknown>).created_at,
    }, 201);
  } catch (err) {
    console.error('[Upload API] Error:', err);
    return errors.internalError();
  }
}

const routeHandler = withAuth(
  async (req, auth) => {
    if (req.method === 'POST') return handleUpload(req, auth);
    return errors.methodNotAllowed(['POST']);
  },
  { allowedMethods: ['POST'] }
);

export const POST = routeHandler;
export const OPTIONS = routeHandler;
