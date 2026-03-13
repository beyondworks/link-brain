/**
 * API v1 Middleware
 *
 * Authentication, rate limiting, and CORS wrapper for v1 API route handlers.
 * Replaces Firebase-based auth with Supabase session + API key auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateApiKey } from './api-key-auth';
import { checkRateLimit, rateLimitHeaders, type SubscriptionTier } from './rate-limiter';
import { errors, sendError, ErrorCodes } from './response';
import { corsHeaders, handleCorsPreflightResponse } from './cors';
import { ensurePublicUser } from './ensure-user';
import type { User, Subscription, ApiKey } from '@/types/database';

export interface AuthContext {
  userId: string;
  /** public.users.id — use this for FK references to users table */
  publicUserId: string;
  keyId?: string;
  tier: SubscriptionTier;
  method: 'apiKey' | 'session';
}

export type ApiRouteHandler = (
  req: NextRequest,
  auth: AuthContext,
  params?: Record<string, string>
) => Promise<NextResponse>;

const MASTER_EMAILS = ['beyondworks.br@gmail.com'];

/**
 * Get subscription tier from users.plan column (set by 017_plan_system migration).
 * Falls back to subscriptions table, then to 'free'.
 */
async function getUserTier(userId: string): Promise<SubscriptionTier> {
  try {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email, plan')
      .eq('auth_id', userId)
      .single();

    const userRow = userData as Pick<User, 'email' | 'plan'> | null;

    // Master email override
    if (userRow?.email && MASTER_EMAILS.includes(userRow.email)) {
      return 'master';
    }

    // Use users.plan column if available
    if (userRow?.plan && ['free', 'pro', 'master'].includes(userRow.plan)) {
      return userRow.plan as SubscriptionTier;
    }

    // Fallback: check subscriptions table
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .single();

    const subRow = sub as Pick<Subscription, 'tier' | 'status'> | null;
    if (subRow && subRow.status === 'active' && ['pro', 'master'].includes(subRow.tier)) {
      return subRow.tier as SubscriptionTier;
    }

    return 'free';
  } catch {
    return 'free';
  }
}

/**
 * Wrap a route handler with auth, CORS, and rate limiting.
 */
export function withAuth(
  handler: ApiRouteHandler,
  options: {
    allowedMethods?: string[];
    requireAuth?: boolean;
    isAiEndpoint?: boolean;
  } = {}
) {
  const {
    allowedMethods = ['GET', 'POST', 'PATCH', 'DELETE'],
    requireAuth = true,
    isAiEndpoint = false,
  } = options;

  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const origin = req.headers.get('origin');
    const cors = corsHeaders(origin);

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return handleCorsPreflightResponse(origin) as NextResponse;
    }

    // Method check
    if (!allowedMethods.includes(req.method)) {
      const res = errors.methodNotAllowed(allowedMethods);
      Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    let auth: AuthContext | null = null;
    let keyId: string | undefined;

    if (requireAuth) {
      // 1. Try X-API-Key header
      const apiKey = req.headers.get('x-api-key');
      if (apiKey) {
        const userId = await validateApiKey(apiKey);
        if (!userId) {
          const res = errors.invalidApiKey();
          Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
          return res;
        }
        const tier = await getUserTier(userId);

        // Get the key's DB id for rate limiting
        const { data: keyRow } = await supabaseAdmin
          .from('api_keys')
          .select('id')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        keyId = keyRow ? (keyRow as Pick<ApiKey, 'id'>).id : undefined;
        const publicUserId = await ensurePublicUser(userId);
        auth = { userId, publicUserId, keyId, tier, method: 'apiKey' };
      } else {
        // 2. Try Bearer token
        const authHeader = req.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice(7);
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
          if (error || !user) {
            const res = sendError(ErrorCodes.AUTH_REQUIRED, 'Invalid or expired token', 401);
            Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
            return res;
          }
          const tier = await getUserTier(user.id);
          const publicUserId = await ensurePublicUser(user.id);
          auth = { userId: user.id, publicUserId, tier, method: 'session' };
        } else {
          // 3. Try cookie-based session
          const supabase = await createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            const res = errors.authRequired();
            Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
            return res;
          }
          const tier = await getUserTier(user.id);
          const publicUserId = await ensurePublicUser(user.id);
          auth = { userId: user.id, publicUserId, tier, method: 'session' };
        }
      }
    }

    // Rate limiting (API key + session auth)
    const rateLimitKey = keyId ?? `session:${auth!.userId}`;
    const rateLimitResult = checkRateLimit(rateLimitKey, auth!.tier, isAiEndpoint);
    const rlHeaders = rateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      const res = errors.rateLimitExceeded(rateLimitResult.retryAfter ?? 60);
      Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
      Object.entries(rlHeaders).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    try {
      const params = await context.params;
      const res = await handler(req, auth!, params);
      Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
      Object.entries(rlHeaders).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    } catch (error) {
      console.error('[API v1] Handler error:', error);
      const res = errors.internalError();
      Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }
  };
}
