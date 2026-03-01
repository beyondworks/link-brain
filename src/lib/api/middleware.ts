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
import type { User, Subscription, ApiKey } from '@/types/database';

export interface AuthContext {
  userId: string;
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
 * Get subscription tier for a user from the subscriptions table.
 */
async function getUserTier(userId: string): Promise<SubscriptionTier> {
  try {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('auth_id', userId)
      .single();

    const userRow = userData as Pick<User, 'email'> | null;
    if (userRow?.email && MASTER_EMAILS.includes(userRow.email)) {
      return 'master';
    }

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .single();

    const subRow = sub as Pick<Subscription, 'tier' | 'status'> | null;
    if (subRow && subRow.tier === 'pro' && subRow.status === 'active') {
      return 'pro';
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
        auth = { userId, keyId, tier, method: 'apiKey' };
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
          auth = { userId: user.id, tier, method: 'session' };
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
          auth = { userId: user.id, tier, method: 'session' };
        }
      }
    }

    // Rate limiting (API key auth only)
    if (auth && keyId) {
      const rateLimitResult = checkRateLimit(keyId, auth.tier, isAiEndpoint);
      const rlHeaders = rateLimitHeaders(rateLimitResult);

      if (!rateLimitResult.allowed) {
        const res = errors.rateLimitExceeded(rateLimitResult.retryAfter ?? 60);
        Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
        Object.entries(rlHeaders).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }

      try {
        const params = await context.params;
        const res = await handler(req, auth, params);
        Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
        Object.entries(rlHeaders).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      } catch (error) {
        console.error('[API v1] Handler error:', error);
        const res = errors.internalError();
        Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }
    }

    // No rate limiting (session auth)
    try {
      const params = await context.params;
      const res = await handler(req, auth!, params);
      Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    } catch (error) {
      console.error('[API v1] Handler error:', error);
      const res = errors.internalError();
      Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }
  };
}
