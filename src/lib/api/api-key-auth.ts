/**
 * API Key Authentication
 *
 * Allows external services (iPhone Shortcuts, Notion, Slack, etc.)
 * to authenticate with Linkbrain using API keys instead of Supabase session cookies.
 *
 * Uses Supabase `api_keys` table (key_hash column) instead of Firebase Firestore.
 */

import * as crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ApiKey } from '@/types/database';

// Escape strict Supabase insert/update generics
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// API key format: lb_xxxxxxxxxxxxxxxxxxxxxxxx
const API_KEY_PREFIX = 'lb_';

// Key limits by tier (must match PLAN_LIMITS in src/config/credits.ts)
export const KEY_LIMITS = {
  free: 0,
  pro: 5,
} as const;

export type ApiKeyTier = keyof typeof KEY_LIMITS;

export type ApiKeyRecord = ApiKey;

/**
 * Generate a new raw API key.
 */
export function generateApiKey(): string {
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `${API_KEY_PREFIX}${randomPart}`;
}

/**
 * Hash an API key for secure storage.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate an API key string and return the owning user_id if valid.
 */
export async function validateApiKey(key: string): Promise<string | null> {
  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const keyHash = hashApiKey(key);

  const { data, error } = await db
    .from('api_keys')
    .select('id, user_id')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as ApiKey;

  // Update last_used_at (fire-and-forget)
  void db
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id);

  return row.user_id;
}

/**
 * Create a new API key for a user and store the hash.
 * Returns the raw key (shown once) and the DB record id.
 */
export async function createApiKey(
  userId: string,
  name: string
): Promise<{ key: string; id: string; keyPrefix: string } | null> {
  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = key.substring(0, 8) + '...';

  const { data, error } = await db
    .from('api_keys')
    .insert({
      user_id: userId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[api-key-auth] Failed to create API key:', error);
    return null;
  }

  const row = data as { id: string };
  return { key, id: row.id, keyPrefix };
}

/**
 * List all API keys for a user (does not return the raw key).
 */
export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const { data, error } = await db
    .from('api_keys')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as ApiKeyRecord[];
}

/**
 * Delete (revoke) a specific API key.
 */
export async function revokeApiKey(
  userId: string,
  keyId: string
): Promise<boolean> {
  const { error } = await db
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', userId);

  return !error;
}
