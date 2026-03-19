/**
 * API v1 - Clips
 *
 * GET  /api/v1/clips  - List clips with filters and pagination
 * POST /api/v1/clips  - Create new clip with URL analysis
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, sendPaginated, sendError, ErrorCodes, errors } from '@/lib/api/response';
import {
  validateBody,
  validateQuery,
  createClipSchema,
  paginationSchema,
  sortSchema,
  clipFiltersSchema,
  dateRangeSchema,
} from '@/lib/api/validate';
import { detectPlatform } from '@/lib/fetchers/platform-detector';
import { resolveDbPlatform } from '@/lib/services/clip-service';
import { checkClipLimit } from '@/lib/services/plan-service';
import type { ClipData, Category } from '@/types/database';
import { z } from 'zod';

// Combined query schema for GET
const listClipsQuerySchema = paginationSchema
  .merge(sortSchema)
  .merge(clipFiltersSchema)
  .merge(dateRangeSchema)
  .extend({
    search: z.string().optional(),
    content: z.enum(['true', 'false']).optional(),
  });

// Column mapping: v1 field name -> Supabase column name
const SORT_COLUMN_MAP: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  title: 'title',
};

// Supabase typed client cast to escape strict insert/update generics
const db = supabaseAdmin;

/**
 * GET /api/v1/clips
 */
async function handleList(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const result = validateQuery(req.nextUrl.searchParams, listClipsQuerySchema);
  if (!result.ok) return result.response;

  const {
    limit = 20,
    offset = 0,
    sort = 'createdAt',
    order = 'desc',
    category,
    platform,
    collectionId,
    isFavorite,
    isReadLater,
    isArchived,
    from,
    to,
    search,
    content,
  } = result.value;

  const includeContent = content === 'true';
  const sortCol = SORT_COLUMN_MAP[sort] ?? 'created_at';

  try {
    // Resolve category name -> category_id
    let categoryId: string | undefined;
    if (category) {
      const { data: catRow } = await db
        .from('categories')
        .select('id')
        .eq('user_id', auth.publicUserId)
        .eq('name', category)
        .single();
      categoryId = (catRow as Pick<Category, 'id'> | null)?.id;
    }

    const selectStr = includeContent
      ? '*, clip_contents(html_content, content_markdown, raw_markdown)'
      : '*';
    let query = db
      .from('clips')
      .select(selectStr as '*', { count: 'exact' })
      .eq('user_id', auth.publicUserId)
      .order(sortCol, { ascending: order === 'asc' });

    if (categoryId) query = query.eq('category_id', categoryId);
    if (platform) query = query.eq('platform', platform);
    if (isFavorite !== undefined) query = query.eq('is_favorite', isFavorite);
    if (isReadLater !== undefined) query = query.eq('is_read_later', isReadLater);
    if (isArchived !== undefined) query = query.eq('is_archived', isArchived);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    // Collection filter via join table
    if (collectionId) {
      const { data: clipIds } = await db
        .from('clip_collections')
        .select('clip_id')
        .eq('collection_id', collectionId);
      const ids = ((clipIds as { clip_id: string }[]) ?? []).map((r) => r.clip_id);
      if (ids.length === 0) {
        return sendPaginated([], 0, limit, offset);
      }
      query = query.in('id', ids);
    }

    if (search) {
      // Escape PostgREST ilike wildcards to prevent pattern extraction
      const escaped = search.replace(/[%_\\]/g, '\\$&');
      query = query.or(`title.ilike.%${escaped}%,summary.ilike.%${escaped}%`);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[API v1 Clips] List error:', error);
      return errors.internalError();
    }

    const clips = ((data as ClipData[]) ?? []).map((clip) =>
      formatClipResponse(clip as unknown as Record<string, unknown>, includeContent)
    );

    return sendPaginated(clips, count ?? 0, limit, offset);
  } catch (err) {
    console.error('[API v1 Clips] List error:', err);
    return errors.internalError();
  }
}

/**
 * POST /api/v1/clips
 *
 * Async pipeline: instant save (status: pending) → 200 → background processing.
 * 1. Duplicate check
 * 2. Insert clip row with processing_status = 'pending'
 * 3. Return 201 immediately
 * 4. Fire-and-forget: trigger /api/internal/process-clip
 */
async function handleCreate(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const bodyResult = await validateBody(req, createClipSchema);
  if (!bodyResult.ok) return bodyResult.response;

  const body = bodyResult.value;
  const { url } = body;

  try {
    // Check plan clip limit
    const clipLimit = await checkClipLimit(auth.publicUserId);
    if (!clipLimit.allowed) {
      return errors.planLimitReached('clip', clipLimit.used ?? 0, clipLimit.limit ?? 0);
    }

    // Check duplicate URL
    const { data: existing } = await db
      .from('clips')
      .select('id')
      .eq('user_id', auth.publicUserId)
      .eq('url', url)
      .single();

    if (existing) {
      return sendError(ErrorCodes.DUPLICATE_URL, 'This URL has already been saved.', 409, {
        existingClipId: (existing as { id: string }).id,
      });
    }

    // 1. Detect platform and resolve DB-safe value
    const detectedPlatform = detectPlatform(url);
    const platform = resolveDbPlatform(detectedPlatform, detectedPlatform);

    // 2. Instant save — use pre-analyzed data if available, otherwise pending
    const { data: clipRow, error: insertError } = await db
      .from('clips')
      .insert({
        user_id: auth.publicUserId,
        url,
        title: body.title || null,
        summary: body.summary || null,
        image: body.image || null,
        author: body.author || null,
        platform,
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
      console.error('[API v1 Clips] Insert error:', insertError);
      return errors.internalError();
    }

    const clipId = (clipRow as { id: string }).id;

    // 3. Handle collectionIds
    if (body.collectionIds && body.collectionIds.length > 0) {
      const joinRows = body.collectionIds.map((cid: string) => ({
        clip_id: clipId,
        collection_id: cid,
      }));
      await db.from('clip_collections').insert(joinRows);
    }

    // 4. Trigger background processing (after response is sent)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const internalSecret = process.env.INTERNAL_API_SECRET;

    if (baseUrl && internalSecret) {
      after(async () => {
        try {
          await fetch(`${baseUrl}/api/internal/process-clip`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': internalSecret,
            },
            body: JSON.stringify({
              clipId,
              url,
              platform: detectedPlatform,
              userId: auth.publicUserId,
            }),
          });
        } catch (err) {
          console.error('[API v1 Clips] Background processing trigger failed:', err);
        }
      });
    }

    // 5. Return immediately with the pending clip
    return sendSuccess(
      formatClipResponse(
        { ...(clipRow as Record<string, unknown>), collectionIds: body.collectionIds ?? [] }
      ),
      201
    );
  } catch (err) {
    console.error('[API v1 Clips] Create error:', err);
    return errors.internalError();
  }
}

/**
 * Format a DB row for the API response.
 */
function formatClipResponse(
  clip: Record<string, unknown>,
  includeContent = false
): Record<string, unknown> {
  const cc = clip.clip_contents as Record<string, unknown> | undefined;

  const response: Record<string, unknown> = {
    id: clip.id,
    url: clip.url,
    title: clip.title,
    summary: clip.summary ?? cc?.summary ?? '',
    category: clip.category_id,
    platform: clip.platform,
    author: clip.author,
    image: clip.image,
    isFavorite: clip.is_favorite ?? false,
    isReadLater: clip.is_read_later ?? false,
    isArchived: clip.is_archived ?? false,
    notes: '',
    keyTakeaways: '',
    collectionIds: clip.collectionIds ?? [],
    processingStatus: clip.processing_status ?? 'ready',
    processingError: clip.processing_error ?? null,
    retryCount: clip.retry_count ?? 0,
    processedAt: clip.processed_at ?? null,
    createdAt: clip.created_at,
    updatedAt: clip.updated_at,
  };

  if (includeContent && cc) {
    response.rawMarkdown = cc.raw_markdown ?? '';
    response.contentMarkdown = cc.content_markdown ?? '';
    response.htmlContent = cc.html_content ?? '';
  }

  return response;
}

// Export route handlers
const routeHandler = withAuth(
  async (req, auth) => {
    if (req.method === 'GET') return handleList(req, auth);
    if (req.method === 'POST') return handleCreate(req, auth);
    return errors.methodNotAllowed(['GET', 'POST']);
  },
  { allowedMethods: ['GET', 'POST'] }
);

export const GET = routeHandler;
export const POST = routeHandler;
export const OPTIONS = routeHandler;
