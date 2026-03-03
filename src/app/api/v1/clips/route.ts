/**
 * API v1 - Clips
 *
 * GET  /api/v1/clips  - List clips with filters and pagination
 * POST /api/v1/clips  - Create new clip with URL analysis
 */

import { NextRequest, NextResponse } from 'next/server';
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
import { fetchUrlContent } from '@/lib/fetchers/orchestrator';
import type { FetchedUrlContent } from '@/lib/fetchers/types';
import { detectPlatform } from '@/lib/fetchers/platform-detector';
import { processNewClip } from '@/lib/services/clip-service';
import { getValidToken } from '@/lib/oauth/token-manager';
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

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

    let query = db
      .from('clips')
      .select(
        includeContent
          ? '*, clip_contents(html_content, content_markdown, raw_markdown)'
          : '*',
        { count: 'exact' }
      )
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
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
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
 * Uses the fetcher orchestrator + clip-service pipeline:
 * 1. fetchUrlContent() — platform-specific content extraction
 * 2. processNewClip() — AI metadata, category, tags, embedding, DB insert
 */
async function handleCreate(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const bodyResult = await validateBody(req, createClipSchema);
  if (!bodyResult.ok) return bodyResult.response;

  const body = bodyResult.value;
  const { url } = body;

  try {
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

    // 1. Fetch content via orchestrator (platform-specific)
    const platform = detectPlatform(url);

    // Look up OAuth token for authenticated API access
    let oauthToken: string | undefined;
    if (platform === 'threads') {
      try {
        oauthToken = await getValidToken(auth.publicUserId, 'threads');
      } catch {
        // No token or lookup failed — continue without OAuth
      }
    }

    let fetchedContent: FetchedUrlContent = { rawText: '', images: [] };
    try {
      fetchedContent = await fetchUrlContent(url, oauthToken ? { oauthToken } : undefined);
    } catch (fetchErr) {
      console.warn('[API v1 Clips] Content fetch failed, continuing with URL-only:', fetchErr);
    }

    // 2. Process clip via clip-service (AI metadata + DB insert)
    const sourceTypeMap: Record<string, 'instagram' | 'threads' | 'youtube' | 'web' | 'twitter'> = {
      instagram: 'instagram',
      threads: 'threads',
      youtube: 'youtube',
      twitter: 'twitter',
      web: 'web',
    };
    const sourceType = sourceTypeMap[platform] ?? 'web';

    const result = await processNewClip({
      url,
      sourceType,
      platform,
      rawText: fetchedContent.rawText,
      htmlContent: fetchedContent.htmlContent,
      images: fetchedContent.images,
      userId: auth.publicUserId,
      author: fetchedContent.author,
      authorAvatar: fetchedContent.authorAvatar,
      authorHandle: fetchedContent.authorHandle,
      embeddedLinks: fetchedContent.embeddedLinks,
    });

    // 3. Handle collectionIds (not in clip-service)
    if (body.collectionIds && body.collectionIds.length > 0) {
      const joinRows = body.collectionIds.map((cid: string) => ({
        clip_id: result.clipId,
        collection_id: cid,
      }));
      await db.from('clip_collections').insert(joinRows);
    }

    // 4. Re-fetch the created clip for full response
    const { data: createdClip } = await db
      .from('clips')
      .select('*')
      .eq('id', result.clipId)
      .single();

    if (!createdClip) {
      return errors.internalError();
    }

    return sendSuccess(
      formatClipResponse(
        { ...(createdClip as Record<string, unknown>), collectionIds: body.collectionIds ?? [] }
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
