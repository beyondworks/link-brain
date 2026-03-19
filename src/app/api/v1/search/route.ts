/**
 * API v1 - Search
 *
 * GET /api/v1/search - Full-text search across clips using PostgreSQL FTS
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendPaginated, errors } from '@/lib/api/response';
import { validateQuery, searchQuerySchema } from '@/lib/api/validate';
import type { ClipData, Category } from '@/types/database';
import { z } from 'zod';

const searchWithContentSchema = searchQuerySchema.extend({
  content: z.enum(['true', 'false']).optional(),
});

// Escape strict Supabase generics
const db = supabaseAdmin;

async function handleSearch(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const result = validateQuery(req.nextUrl.searchParams, searchWithContentSchema);
  if (!result.ok) return result.response;

  const {
    q,
    limit = 20,
    offset = 0,
    category,
    platform,
    collectionId,
    isFavorite,
    isReadLater,
    isArchived,
    from,
    to,
    content,
  } = result.value;

  const includeContent = content === 'true';

  try {
    // Resolve category name -> id
    let categoryId: string | undefined;
    if (category) {
      const { data: catRow } = await db
        .from('categories')
        .select('id')
        .eq('user_id', auth.publicUserId)
        .eq('name', category)
        .single();
      categoryId = catRow ? (catRow as Pick<Category, 'id'>).id : undefined;
    }

    const selectStr = includeContent
      ? '*, clip_contents(html_content, content_markdown, raw_markdown)'
      : '*';
    let query = db
      .from('clips')
      .select(selectStr as '*', { count: 'exact' })
      .eq('user_id', auth.publicUserId)
      .or(`fts.plfts(simple).${q},title.ilike.%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%,summary.ilike.%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`)
      .order('created_at', { ascending: false });

    if (categoryId) query = query.eq('category_id', categoryId);
    if (platform) query = query.eq('platform', platform);
    if (isFavorite !== undefined) query = query.eq('is_favorite', isFavorite);
    if (isReadLater !== undefined) query = query.eq('is_read_later', isReadLater);
    if (isArchived !== undefined) query = query.eq('is_archived', isArchived);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    // Collection filter
    if (collectionId) {
      const { data: clipIds } = await db
        .from('clip_collections')
        .select('clip_id')
        .eq('collection_id', collectionId);
      const ids = ((clipIds as { clip_id: string }[]) ?? []).map((r) => r.clip_id);
      if (ids.length === 0) return sendPaginated([], 0, limit, offset);
      query = query.in('id', ids);
    }

    const { data, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[API v1 Search] Query error:', error);
      return errors.internalError();
    }

    const clips = ((data as ClipData[]) ?? []).map((clip) => {
      const clipAny = clip as unknown as Record<string, unknown>;
      const cc = clipAny.clip_contents as Record<string, unknown> | undefined;
      const item: Record<string, unknown> = {
        id: clip.id,
        url: clip.url,
        title: clip.title,
        summary: clip.summary,
        category: clip.category_id,
        platform: clip.platform,
        author: clip.author,
        image: clip.image,
        isFavorite: clip.is_favorite ?? false,
        isReadLater: clip.is_read_later ?? false,
        isArchived: clip.is_archived ?? false,
        createdAt: clip.created_at,
      };

      if (includeContent && cc) {
        item.rawMarkdown = cc.raw_markdown ?? '';
        item.contentMarkdown = cc.content_markdown ?? '';
        item.htmlContent = cc.html_content ?? '';
      }

      return item;
    });

    return sendPaginated(clips, count ?? 0, limit, offset);
  } catch (err) {
    console.error('[API v1 Search] Error:', err);
    return errors.internalError();
  }
}

const handler = withAuth(
  async (req, auth) => {
    if (req.method === 'GET') return handleSearch(req, auth);
    return errors.methodNotAllowed(['GET']);
  },
  { allowedMethods: ['GET'] }
);

export const GET = handler;
export const OPTIONS = handler;
