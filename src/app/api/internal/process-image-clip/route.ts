/**
 * Internal API: Background image clip processing
 *
 * POST /api/internal/process-image-clip
 * Body: { clipId, storagePath, userId }
 *
 * Called fire-and-forget after an image clip is saved.
 * Runs OCR via GPT-4o-mini vision + AI enrichment in the background.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseImageWithVision } from '@/lib/ocr/vision-parser';
import { autoTagClip, generateClipMetadata } from '@/lib/services/clip-service';
import { indexClipEmbedding } from '@/lib/ai/embeddings';
import { generatePdf } from '@/lib/pdf/pdf-generator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

interface ProcessImageClipBody {
  clipId: string;
  storagePath: string;
  userId: string;
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Internal authentication — always required
  if (!INTERNAL_SECRET) {
    console.error('[ProcessImageClip] INTERNAL_API_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const secret = req.headers.get('x-internal-secret');
  if (secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ProcessImageClipBody;
  try {
    body = (await req.json()) as ProcessImageClipBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { clipId, storagePath, userId } = body;

  if (!clipId || !storagePath || !userId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // Step 1: Mark as processing
    await db
      .from('clips')
      .update({ processing_status: 'processing' })
      .eq('id', clipId);

    // Step 2: Get public URL for the image from Supabase Storage
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('clip-uploads').getPublicUrl(storagePath);

    // Step 3: OCR via GPT-4o-mini vision
    const visionResult = await parseImageWithVision(publicUrl);

    // Step 4: Update clip_images row with ocr_text and structured_data
    await db
      .from('clip_images')
      .update({
        ocr_text: visionResult.fullContent,
        structured_data: {
          tables: visionResult.tables,
          metadata: visionResult.metadata,
        },
      })
      .eq('clip_id', clipId);

    // Step 5: Insert clip_contents row
    await db.from('clip_contents').insert({
      clip_id: clipId,
      content_markdown: visionResult.fullContent,
      raw_markdown: visionResult.fullContent,
    });

    // Step 6: Generate AI metadata from OCR text for better title/keywords
    const aiMetadata = await generateClipMetadata(
      visionResult.fullContent,
      publicUrl,
      'image',
    );

    const clipTitle = aiMetadata?.title ?? visionResult.summary.substring(0, 200);
    const clipSummary = aiMetadata?.summary ?? visionResult.summary;
    const keywords = aiMetadata?.keywords ?? [];

    // Step 7: Update clip with enriched data
    await db
      .from('clips')
      .update({
        title: clipTitle,
        summary: clipSummary,
        processing_status: 'ready',
        processed_at: new Date().toISOString(),
      })
      .eq('id', clipId);

    // Step 8: Fire-and-forget — auto-tag + embed
    autoTagClip(clipId, keywords).catch((err: unknown) => {
      console.error(`[ProcessImageClip] autoTagClip failed for ${clipId}:`, err);
    });
    indexClipEmbedding({
      clipId,
      title: clipTitle,
      summary: clipSummary,
      rawText: visionResult.fullContent,
    }).catch((err: unknown) => {
      console.error(`[ProcessImageClip] indexClipEmbedding failed for ${clipId}:`, err);
    });

    // Step 9: Generate PDF and upload to Supabase Storage
    try {
      const pdfBuffer = await generatePdf({
        title: clipTitle,
        summary: clipSummary,
        fullContent: visionResult.fullContent,
        tables: visionResult.tables,
        sourceImageUrl: publicUrl,
        metadata: visionResult.metadata,
      });

      const pdfPath = `${userId}/${clipId}.pdf`;
      const { error: pdfUploadError } = await supabaseAdmin.storage
        .from('clip-pdfs')
        .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

      if (pdfUploadError) {
        console.error(`[ProcessImageClip] PDF upload error for ${clipId}:`, pdfUploadError);
      } else {
        await db
          .from('clip_images')
          .update({ pdf_storage_path: pdfPath })
          .eq('clip_id', clipId);
      }
    } catch (pdfErr) {
      // PDF generation is non-fatal
      console.error(`[ProcessImageClip] PDF generation failed for ${clipId}:`, pdfErr);
    }

    // Step 10: Return success
    return NextResponse.json({ success: true, clipId });
  } catch (err) {
    console.error(`[ProcessImageClip] Failed for clip ${clipId}:`, err);

    // Mark as failed with error message + increment retry_count
    const errorMessage = err instanceof Error ? err.message : 'Unknown processing error';

    const { data: current } = await db
      .from('clips')
      .select('retry_count')
      .eq('id', clipId)
      .single();

    const currentRetry = (current as { retry_count: number } | null)?.retry_count ?? 0;

    await db
      .from('clips')
      .update({
        processing_status: 'failed',
        processing_error: errorMessage.substring(0, 500),
        retry_count: currentRetry + 1,
      })
      .eq('id', clipId);

    return NextResponse.json(
      { error: 'Processing failed', clipId, message: errorMessage },
      { status: 500 }
    );
  }
}
