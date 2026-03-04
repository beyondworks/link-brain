/**
 * OAuth Token Manager
 *
 * Handles encryption/decryption of OAuth tokens (AES-256-GCM)
 * and automatic token refresh for Threads long-lived tokens.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { OAuthConnection, OAuthProvider } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

// ─── Encryption ─────────────────────────────────────────────────────────────

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const TAG_LENGTH = 128;

function getEncryptionKey(): ArrayBuffer {
  const hex = process.env.OAUTH_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('OAUTH_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: ALGORITHM },
    false,
    ['encrypt'],
  );

  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    cryptoKey,
    encoded,
  );

  // Format: base64(iv + ciphertext_with_tag)
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);

  // Loop-based encoding to avoid stack overflow with spread on large arrays
  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

export async function decryptToken(encrypted: string): Promise<string> {
  const key = getEncryptionKey();
  const binaryStr = atob(encrypted);
  const combined = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    combined[i] = binaryStr.charCodeAt(i);
  }

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: ALGORITHM },
    false,
    ['decrypt'],
  );

  const plainBuf = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    cryptoKey,
    ciphertext,
  );

  return new TextDecoder().decode(plainBuf);
}

// ─── Threads Token Refresh ──────────────────────────────────────────────────

async function refreshThreadsToken(currentToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const url = new URL('https://graph.threads.net/refresh_access_token');
  url.searchParams.set('grant_type', 'th_refresh_token');
  url.searchParams.set('access_token', currentToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Threads token refresh failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

// ─── Main API ───────────────────────────────────────────────────────────────

/**
 * Get a valid (decrypted) token for the given user + provider.
 * Automatically refreshes if token expires within 7 days.
 * Returns undefined if no connection exists.
 */
export async function getValidToken(
  userId: string,
  provider: OAuthProvider,
): Promise<string | undefined> {
  const { data, error } = await db
    .from('oauth_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (error || !data) return undefined;

  const conn = data as OAuthConnection;

  let plainToken: string;
  try {
    plainToken = await decryptToken(conn.access_token);
  } catch {
    // Token corrupted — remove connection
    await db.from('oauth_connections').delete().eq('id', conn.id);
    return undefined;
  }

  // Check if refresh is needed (7 days before expiry)
  if (conn.token_expires_at) {
    const expiresAt = new Date(conn.token_expires_at).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const needsRefresh = expiresAt - Date.now() < sevenDaysMs;

    if (needsRefresh && provider === 'threads') {
      try {
        const refreshed = await refreshThreadsToken(plainToken);
        const newEncrypted = await encryptToken(refreshed.access_token);
        const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

        await db
          .from('oauth_connections')
          .update({
            access_token: newEncrypted,
            token_expires_at: newExpiry,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conn.id);

        return refreshed.access_token;
      } catch (refreshErr) {
        console.error(`[TokenManager] Failed to refresh ${provider} token:`, refreshErr);
        // Return existing token — still valid until expiry
      }
    }
  }

  return plainToken;
}

/**
 * Store an encrypted OAuth connection.
 * Upserts on (user_id, provider).
 */
export async function storeOAuthConnection(params: {
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  providerUsername?: string;
  accessToken: string;
  tokenExpiresIn?: number;
  scopes?: string[];
}): Promise<void> {
  const encryptedToken = await encryptToken(params.accessToken);
  const expiresAt = params.tokenExpiresIn
    ? new Date(Date.now() + params.tokenExpiresIn * 1000).toISOString()
    : null;

  const { error } = await db
    .from('oauth_connections')
    .upsert(
      {
        user_id: params.userId,
        provider: params.provider,
        provider_user_id: params.providerUserId,
        provider_username: params.providerUsername ?? null,
        access_token: encryptedToken,
        token_expires_at: expiresAt,
        scopes: params.scopes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' },
    );

  if (error) {
    throw new Error(`Failed to store OAuth connection: ${error.message}`);
  }
}

/**
 * List OAuth connections for a user (without tokens).
 */
export async function listConnections(
  userId: string,
): Promise<Array<{
  provider: OAuthProvider;
  providerUsername: string | null;
  connectedAt: string;
}>> {
  const { data, error } = await db
    .from('oauth_connections')
    .select('provider, provider_username, connected_at')
    .eq('user_id', userId);

  if (error) {
    // Table doesn't exist yet (migration 009 not applied) — return empty
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return [];
    }
    throw new Error(`Failed to list connections: ${error.message}`);
  }

  return ((data as Pick<OAuthConnection, 'provider' | 'provider_username' | 'connected_at'>[]) ?? []).map((row) => ({
    provider: row.provider,
    providerUsername: row.provider_username,
    connectedAt: row.connected_at,
  }));
}

/**
 * Remove an OAuth connection.
 */
export async function removeConnection(
  userId: string,
  provider: OAuthProvider,
): Promise<void> {
  const { error } = await db
    .from('oauth_connections')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) {
    throw new Error(`Failed to remove connection: ${error.message}`);
  }
}
