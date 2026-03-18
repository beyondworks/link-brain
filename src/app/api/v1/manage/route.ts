/**
 * API v1 - Manage
 *
 * Sub-action routing via ?action= query parameter.
 *
 * GET  ?action=categories       - List clip categories with counts
 * POST ?action=categories       - Create custom category
 * GET  ?action=tags             - Search clips by tags/keywords
 * POST ?action=bulk             - Bulk operations on clips
 * GET  ?action=webhooks         - List webhook subscriptions
 * POST ?action=webhooks         - Create webhook subscription
 * DELETE ?action=webhooks&id=   - Delete webhook subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, sendPaginated, sendError, ErrorCodes, errors } from '@/lib/api/response';
import {
  validateBody,
  validateQuery,
  categorySchema,
  tagSearchSchema,
  bulkOperationSchema,
  webhookSchema,
} from '@/lib/api/validate';
import type { Category, Webhook } from '@/types/database';
import * as crypto from 'crypto';

// Webhook subscription limits by tier
const WEBHOOK_LIMITS: Record<string, number> = {
  free: 2,
  pro: 10,
};

// Escape strict Supabase generics
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// ============================================
// Categories
// ============================================

async function handleListCategories(
  _req: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  const { data, error } = await db
    .from('clips')
    .select('category_id, categories(id, name, color)')
    .eq('user_id', auth.publicUserId)
    .not('category_id', 'is', null);

  if (error) {
    console.error('[API v1 Manage] List categories error:', error);
    return errors.internalError();
  }

  const categoryMap = new Map<string, { name: string; color: string | null; clipCount: number }>();
  for (const row of (data as { category_id: string; categories: Pick<Category, 'id' | 'name' | 'color'> | null }[]) ?? []) {
    if (!row.category_id || !row.categories) continue;
    const existing = categoryMap.get(row.category_id);
    if (existing) {
      existing.clipCount++;
    } else {
      categoryMap.set(row.category_id, {
        name: row.categories.name,
        color: row.categories.color,
        clipCount: 1,
      });
    }
  }

  const categories = Array.from(categoryMap.entries())
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => b.clipCount - a.clipCount);

  return sendSuccess(categories);
}

async function handleCreateCategory(
  req: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  const bodyResult = await validateBody(req, categorySchema);
  if (!bodyResult.ok) return bodyResult.response;
  const { name, color } = bodyResult.value;

  // Check for duplicate
  const { data: existing } = await db
    .from('categories')
    .select('id')
    .eq('user_id', auth.publicUserId)
    .eq('name', name)
    .single();

  if (existing) {
    return sendError(ErrorCodes.DUPLICATE_CATEGORY, 'Category already exists.', 409);
  }

  const { data, error } = await db
    .from('categories')
    .insert({
      user_id: auth.publicUserId,
      name,
      color: color ?? '#6B7280',
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[API v1 Manage] Create category error:', error);
    return errors.internalError();
  }

  const cat = data as Category;
  return sendSuccess({ id: cat.id, name: cat.name, color: cat.color, clipCount: 0 }, 201);
}

// ============================================
// Tags
// ============================================

async function handleTags(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  if (req.method !== 'GET') return errors.methodNotAllowed(['GET']);

  const result = validateQuery(req.nextUrl.searchParams, tagSearchSchema);
  if (!result.ok) return result.response;

  const { tags, match, limit = 20, offset = 0 } = result.value;

  // Find tag IDs matching the requested tag names
  const { data: tagRows } = await db
    .from('tags')
    .select('id, name')
    .in('name', tags as string[]);

  if (!tagRows || (tagRows as { id: string; name: string }[]).length === 0) {
    return sendPaginated([], 0, limit, offset);
  }

  const typedTagRows = tagRows as { id: string; name: string }[];
  const tagIds = typedTagRows.map((t) => t.id);
  const foundTagNames = typedTagRows.map((t) => t.name);

  // Get clip_ids that have these tags
  const { data: clipTagRows } = await db
    .from('clip_tags')
    .select('clip_id, tag_id')
    .in('tag_id', tagIds);

  if (!clipTagRows || (clipTagRows as { clip_id: string; tag_id: string }[]).length === 0) {
    return sendPaginated([], 0, limit, offset);
  }

  // Group by clip_id
  const clipTagMap = new Map<string, Set<string>>();
  for (const row of clipTagRows as { clip_id: string; tag_id: string }[]) {
    if (!clipTagMap.has(row.clip_id)) clipTagMap.set(row.clip_id, new Set());
    clipTagMap.get(row.clip_id)!.add(row.tag_id);
  }

  // Filter by match mode
  const matchingClipIds: string[] = [];
  for (const [clipId, clipTagIds] of clipTagMap.entries()) {
    if (match === 'all') {
      if (tagIds.every((tid) => clipTagIds.has(tid))) matchingClipIds.push(clipId);
    } else {
      if (tagIds.some((tid) => clipTagIds.has(tid))) matchingClipIds.push(clipId);
    }
  }

  if (matchingClipIds.length === 0) return sendPaginated([], 0, limit, offset);

  const { data: clips, error } = await db
    .from('clips')
    .select('*')
    .eq('user_id', auth.publicUserId)
    .in('id', matchingClipIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[API v1 Manage] Tags search error:', error);
    return errors.internalError();
  }

  const allClips = (clips as Record<string, unknown>[]) ?? [];
  const total = allClips.length;
  const paginated = allClips.slice(offset, offset + limit);

  const formatted = paginated.map((clip) => ({
    id: clip.id,
    url: clip.url,
    title: clip.title,
    summary: clip.summary,
    tags: foundTagNames,
    category: clip.category_id,
    platform: clip.platform,
    author: clip.author,
    image: clip.image,
    isFavorite: clip.is_favorite ?? false,
    isReadLater: clip.is_read_later ?? false,
    isArchived: clip.is_archived ?? false,
    createdAt: clip.created_at,
    updatedAt: clip.updated_at,
  }));

  return sendPaginated(formatted, total, limit, offset);
}

// ============================================
// Bulk Operations
// ============================================

async function handleBulk(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  if (req.method !== 'POST') return errors.methodNotAllowed(['POST']);

  const bodyResult = await validateBody(req, bulkOperationSchema);
  if (!bodyResult.ok) return bodyResult.response;
  const { action, ids, category, tags: bulkTags, value } = bodyResult.value;

  let processed = 0;
  let failed = 0;

  for (const clipId of ids) {
    const { data: clip, error: fetchErr } = await db
      .from('clips')
      .select('id, user_id')
      .eq('id', clipId)
      .single();

    if (fetchErr || !clip || (clip as { user_id: string }).user_id !== auth.publicUserId) {
      failed++;
      continue;
    }

    switch (action) {
      case 'delete': {
        const { error } = await db.from('clips').delete().eq('id', clipId);
        if (error) failed++;
        else processed++;
        break;
      }

      case 'move': {
        if (!category) { failed++; break; }
        const { data: catRow } = await db
          .from('categories')
          .select('id')
          .eq('user_id', auth.publicUserId)
          .eq('name', category)
          .single();
        if (!catRow) { failed++; break; }
        const { error } = await db
          .from('clips')
          .update({ category_id: (catRow as Pick<Category, 'id'>).id, updated_at: new Date().toISOString() })
          .eq('id', clipId);
        if (error) failed++;
        else processed++;
        break;
      }

      case 'tag': {
        if (!bulkTags || bulkTags.length === 0) { failed++; break; }
        for (const tagName of bulkTags) {
          const { data: tagRow } = await db
            .from('tags')
            .upsert({ name: tagName }, { onConflict: 'name' })
            .select('id')
            .single();
          if (tagRow) {
            await db
              .from('clip_tags')
              .upsert(
                { clip_id: clipId, tag_id: (tagRow as { id: string }).id },
                { onConflict: 'clip_id,tag_id' }
              );
          }
        }
        processed++;
        break;
      }

      case 'favorite': {
        const { error } = await db
          .from('clips')
          .update({ is_favorite: value ?? true, updated_at: new Date().toISOString() })
          .eq('id', clipId);
        if (error) failed++;
        else processed++;
        break;
      }

      case 'archive': {
        const { error } = await db
          .from('clips')
          .update({ is_archived: value ?? true, updated_at: new Date().toISOString() })
          .eq('id', clipId);
        if (error) failed++;
        else processed++;
        break;
      }

      default:
        failed++;
    }
  }

  return sendSuccess({ processed, failed });
}

// ============================================
// Webhooks
// ============================================

async function handleListWebhooks(
  _req: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  const { data, error } = await db
    .from('webhooks')
    .select('*')
    .eq('user_id', auth.publicUserId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('[API v1 Manage] List webhooks error:', error);
    return errors.internalError();
  }

  const webhooks = ((data as Webhook[]) ?? []).map((w) => ({
    id: w.id,
    url: w.url,
    events: w.events,
    isActive: w.is_active,
    createdAt: w.timestamp,
  }));

  return sendSuccess(webhooks);
}

async function handleCreateWebhook(
  req: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  const bodyResult = await validateBody(req, webhookSchema);
  if (!bodyResult.ok) return bodyResult.response;
  const { url, events, label } = bodyResult.value;

  // Check webhook limit
  const maxWebhooks = WEBHOOK_LIMITS[auth.tier] ?? WEBHOOK_LIMITS['free'];
  const { count } = await db
    .from('webhooks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', auth.publicUserId);

  if ((count ?? 0) >= maxWebhooks) {
    return sendError(
      ErrorCodes.WEBHOOK_LIMIT_REACHED,
      `Webhook limit reached. Max ${maxWebhooks} for ${auth.tier} tier.`,
      403,
      { limit: maxWebhooks, current: count }
    );
  }

  // Verify URL
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return sendError(ErrorCodes.HTTPS_REQUIRED, 'Webhook URL must use HTTPS.', 400);
    }
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    const ping = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Linkbrain-Event': 'ping' },
      body: JSON.stringify({ event: 'ping' }),
      signal: ctrl.signal,
    }).catch(() => null);
    clearTimeout(timeout);
    if (!ping || ping.status >= 500) {
      return sendError(
        ErrorCodes.WEBHOOK_UNREACHABLE,
        'Webhook URL is unreachable or returned a server error.',
        400
      );
    }
  } catch {
    return sendError(ErrorCodes.INVALID_REQUEST, 'Invalid webhook URL.', 400);
  }

  const secret = 'whsec_' + crypto.randomBytes(20).toString('hex');

  const { data, error } = await db
    .from('webhooks')
    .insert({
      user_id: auth.publicUserId,
      url,
      events,
      secret,
      is_active: true,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('[API v1 Manage] Create webhook error:', error);
    return errors.internalError();
  }

  const webhook = data as Webhook;
  return sendSuccess(
    {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret,
      label: label ?? null,
      isActive: webhook.is_active,
      createdAt: webhook.timestamp,
    },
    201
  );
}

async function handleDeleteWebhook(
  req: NextRequest,
  auth: AuthContext
): Promise<NextResponse> {
  const webhookId = req.nextUrl.searchParams.get('id');
  if (!webhookId) return errors.invalidRequest('Webhook ID is required');

  const { data: existing, error: fetchErr } = await db
    .from('webhooks')
    .select('id, user_id')
    .eq('id', webhookId)
    .single();

  if (fetchErr || !existing) {
    return sendError(ErrorCodes.WEBHOOK_NOT_FOUND, 'Webhook subscription not found.', 404);
  }
  if ((existing as Pick<Webhook, 'user_id'>).user_id !== auth.publicUserId) return errors.accessDenied();

  const { error } = await db
    .from('webhooks')
    .delete()
    .eq('id', webhookId);

  if (error) {
    console.error('[API v1 Manage] Delete webhook error:', error);
    return errors.internalError();
  }

  return sendSuccess({ id: webhookId, deleted: true });
}

// ============================================
// Main router
// ============================================

const mainHandler = withAuth(
  async (req, auth) => {
    const action = req.nextUrl.searchParams.get('action');

    switch (action) {
      case 'categories':
        if (req.method === 'GET') return handleListCategories(req, auth);
        if (req.method === 'POST') return handleCreateCategory(req, auth);
        return errors.methodNotAllowed(['GET', 'POST']);

      case 'tags':
        return handleTags(req, auth);

      case 'bulk':
        return handleBulk(req, auth);

      case 'webhooks':
        if (req.method === 'GET') return handleListWebhooks(req, auth);
        if (req.method === 'POST') return handleCreateWebhook(req, auth);
        if (req.method === 'DELETE') return handleDeleteWebhook(req, auth);
        return errors.methodNotAllowed(['GET', 'POST', 'DELETE']);

      default:
        return errors.invalidRequest(
          'Invalid action. Use: categories, tags, bulk, webhooks'
        );
    }
  },
  { allowedMethods: ['GET', 'POST', 'DELETE'] }
);

export const GET = mainHandler;
export const POST = mainHandler;
export const DELETE = mainHandler;
export const OPTIONS = mainHandler;
