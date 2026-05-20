import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';

/**
 * Hard ceiling for the Supabase auth round-trip inside Vercel middleware.
 *
 * Middleware invocations on Vercel have a strict timeout (≤25–30s on Hobby).
 * If Supabase auth has a slow request, the whole middleware hangs and the
 * gateway returns 504 MIDDLEWARE_INVOCATION_TIMEOUT. We bound the auth call
 * so the rest of the request still gets through and downstream code (route
 * handlers, client SupabaseProvider) can decide what to do.
 */
const AUTH_LOOKUP_TIMEOUT_MS = 4_000;

export type AuthStatus = 'ok' | 'timeout' | 'no-config';

export interface UpdateSessionResult {
  supabaseResponse: NextResponse;
  user: Awaited<ReturnType<typeof getUserSafe>>['user'];
  authStatus: AuthStatus;
}

type Cookie = { name: string; value: string; options?: Record<string, unknown> };

async function getUserSafe(
  supabase: ReturnType<typeof createServerClient<Database>>
): Promise<{ user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']; status: AuthStatus }> {
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AUTH_TIMEOUT')), AUTH_LOOKUP_TIMEOUT_MS)
      ),
    ]);
    return { user: result.data.user, status: 'ok' };
  } catch (err) {
    if (err instanceof Error && err.message === 'AUTH_TIMEOUT') {
      console.warn('[middleware] supabase.auth.getUser timed out — failing open');
      return { user: null, status: 'timeout' };
    }
    console.warn('[middleware] supabase.auth.getUser error — failing open', err);
    return { user: null, status: 'timeout' };
  }
}

export async function updateSession(request: NextRequest): Promise<UpdateSessionResult> {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { supabaseResponse, user: null, authStatus: 'no-config' };
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Cookie[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session — do not add logic between createServerClient and getUser
  const { user, status } = await getUserSafe(supabase);

  return { supabaseResponse, user, authStatus: status };
}
