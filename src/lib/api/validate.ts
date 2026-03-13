/**
 * API v1 Validation Utilities
 *
 * Zod-based request validation with consistent error formatting.
 * Adapted for Next.js App Router (NextRequest instead of VercelRequest).
 */

import { z, ZodError, ZodSchema } from 'zod';
import { errors } from './response';
import type { NextResponse } from 'next/server';

/**
 * Parse and validate a plain object against a Zod schema.
 * Returns parsed data or throws a NextResponse error (caller should return it).
 */
export function parseOrError<T>(
  data: unknown,
  schema: ZodSchema<T>
): { ok: true; value: T } | { ok: false; response: NextResponse } {
  try {
    return { ok: true, value: schema.parse(data) };
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.reduce(
        (acc, err) => {
          const path = err.path.join('.');
          acc[path] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );
      return {
        ok: false,
        response: errors.invalidRequest('Validation failed', {
          validationErrors: details,
        }),
      };
    }
    return {
      ok: false,
      response: errors.invalidRequest('Failed to parse request data'),
    };
  }
}

/**
 * Parse request body (JSON) against a Zod schema.
 */
export async function validateBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ ok: true; value: T } | { ok: false; response: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      response: errors.invalidRequest('Failed to parse request body as JSON'),
    };
  }
  return parseOrError(body, schema);
}

/**
 * Parse URL search params against a Zod schema.
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): { ok: true; value: T } | { ok: false; response: NextResponse } {
  const raw: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return parseOrError(raw, schema);
}

// ============================================
// Common Schemas
// ============================================

// Pagination query params
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Sort query params
export const sortSchema = z.object({
  sort: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Date range filter
export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// Clip filters
export const clipFiltersSchema = z.object({
  category: z.string().optional(),
  platform: z
    .enum(['youtube', 'instagram', 'threads', 'web', 'linkedin', 'image'])
    .optional(),
  collectionId: z.string().optional(),
  isFavorite: z.coerce.boolean().optional(),
  isReadLater: z.coerce.boolean().optional(),
  isArchived: z.coerce.boolean().optional(),
});

// Create clip body
export const createClipSchema = z.object({
  url: z.string().url('Invalid URL format'),
  title: z.string().optional(),
  summary: z.string().optional(),
  image: z.string().optional(),
  author: z.string().optional(),
  category: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  notes: z.string().optional(),
  collectionIds: z.array(z.string()).optional(),
});

// Update clip body
export const updateClipSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  category: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  notes: z.string().optional(),
  keyTakeaways: z.string().optional(),
  isFavorite: z.boolean().optional(),
  isReadLater: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  collectionIds: z.array(z.string()).optional(),
});

// Bulk operation body
export const bulkOperationSchema = z.object({
  action: z.enum(['delete', 'move', 'tag', 'favorite', 'archive']),
  ids: z.array(z.string()).min(1).max(100),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  value: z.boolean().optional(),
});

// Category body
export const categorySchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
});

// Collection body
export const collectionSchema = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
  isPublic: z.boolean().optional(),
});

// Webhook subscription body
export const webhookSchema = z.object({
  url: z
    .string()
    .url()
    .refine((url) => url.startsWith('https://'), 'Webhook URL must use HTTPS'),
  events: z
    .array(
      z.enum([
        'clip.created',
        'clip.updated',
        'clip.deleted',
        'clip.analyzed',
        'ai.generated',
        'collection.shared',
      ])
    )
    .min(1),
  label: z.string().max(50).optional(),
});

// AI generate body
export const aiGenerateSchema = z.object({
  type: z.enum([
    'report',
    'planning',
    'trend',
    'big-picture',
    'step-by-step',
    'chapter-lessons',
    'simplify',
    'key-concepts',
    'quiz',
    'visual-map',
    'review-notes',
    'teach-back',
    'sns-post',
    'newsletter',
    'presentation',
    'email-draft',
    'blog-post',
    'executive-summary',
  ]),
  clipIds: z.array(z.string()).min(1).max(20),
  language: z.enum(['ko', 'en']).default('ko'),
  platform: z.enum(['twitter', 'linkedin', 'instagram']).optional(),
});

// API key creation body
export const createApiKeySchema = z.object({
  label: z.string().max(50).optional(),
});

// Search query
export const searchQuerySchema = paginationSchema
  .extend({
    q: z.string().min(1).max(200),
  })
  .merge(clipFiltersSchema)
  .merge(dateRangeSchema);

// Tag search query
export const tagSearchSchema = paginationSchema.extend({
  tags: z.preprocess(
    (val) => (typeof val === 'string' ? val.split(',') : val),
    z.array(z.string())
  ),
  match: z.enum(['all', 'any']).default('any'),
});

export type PaginationParams = z.infer<typeof paginationSchema>;
export type CreateClipBody = z.infer<typeof createClipSchema>;
export type UpdateClipBody = z.infer<typeof updateClipSchema>;
export type BulkOperationBody = z.infer<typeof bulkOperationSchema>;
export type WebhookBody = z.infer<typeof webhookSchema>;
export type AIGenerateBody = z.infer<typeof aiGenerateSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
