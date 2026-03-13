/**
 * API v1 - API Keys
 *
 * GET  /api/v1/keys — 사용자의 API 키 목록 (key_hash 제외)
 * POST /api/v1/keys — 새 API 키 생성 (name 필수, 플랜별 개수 제한)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/middleware';
import { sendSuccess, sendError, ErrorCodes, errors } from '@/lib/api/response';
import { createApiKey, listApiKeys, KEY_LIMITS } from '@/lib/api/api-key-auth';
import { checkApiKeyLimit } from '@/lib/services/plan-service';
import type { ApiKey } from '@/types/database';

// Safe API key view (key_hash 제외)
interface ApiKeyView {
  id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  timestamp: string;
}

function toView(record: ApiKey): ApiKeyView {
  return {
    id: record.id,
    key_prefix: record.key_prefix,
    name: record.name,
    last_used_at: record.last_used_at,
    timestamp: record.timestamp,
  };
}

/**
 * GET /api/v1/keys
 */
async function handleList(_req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  const keys = await listApiKeys(auth.publicUserId);
  return sendSuccess(keys.map(toView));
}

/**
 * POST /api/v1/keys
 */
async function handleCreate(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errors.invalidRequest('Request body must be valid JSON.');
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('name' in body) ||
    typeof (body as Record<string, unknown>).name !== 'string'
  ) {
    return errors.invalidRequest('Field "name" is required and must be a string.');
  }

  const name = ((body as Record<string, unknown>).name as string).trim();
  if (!name || name.length < 1 || name.length > 64) {
    return errors.invalidRequest('Field "name" must be between 1 and 64 characters.');
  }

  // Check plan API key limit
  const apiKeyLimit = await checkApiKeyLimit(auth.publicUserId);
  if (!apiKeyLimit.allowed) {
    return errors.planLimitReached('api_key', apiKeyLimit.used ?? 0, apiKeyLimit.limit ?? 0);
  }

  // 플랜별 키 개수 제한
  const tier = auth.tier === 'pro' || auth.tier === 'master' ? auth.tier : 'free';
  const limit = KEY_LIMITS[tier as keyof typeof KEY_LIMITS] ?? KEY_LIMITS.free;
  const existing = await listApiKeys(auth.publicUserId);

  if (existing.length >= limit) {
    return sendError(
      ErrorCodes.KEY_LIMIT_REACHED,
      `API key limit reached. Your plan allows up to ${limit} keys.`,
      403,
      { current: existing.length, limit }
    );
  }

  const result = await createApiKey(auth.publicUserId, name);
  if (!result) {
    return errors.internalError('Failed to create API key.');
  }

  return sendSuccess(
    {
      key: result.key,
      id: result.id,
      keyPrefix: result.keyPrefix,
    },
    201
  );
}

export const GET = withAuth(handleList, { allowedMethods: ['GET'] });
export const POST = withAuth(handleCreate, { allowedMethods: ['POST'] });
