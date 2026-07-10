import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_ROUTES = ['/dashboard', '/settings', '/studio', '/insights', '/admin', '/favorites', '/read-later', '/archive', '/collections', '/clip', '/graph', '/highlights'];
const AUTH_ROUTES = ['/login', '/signup'];

function matchesRoutes(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function hasAuthCookie(request: NextRequest): boolean {
  // Supabase SSR cookie names: `sb-<ref>-auth-token` (single) or
  // `sb-<ref>-auth-token.0`, `sb-<ref>-auth-token.1`, ... (chunked when JWT is large).
  // OAuth logins / users with large metadata trigger chunking, so we must match both.
  return request.cookies.getAll().some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = matchesRoutes(pathname, PROTECTED_ROUTES);
  const isAuthRoute = matchesRoutes(pathname, AUTH_ROUTES);

  // Fast path #1: route doesn't need auth gating → skip Supabase entirely.
  // Why: Supabase /user has been responding in 2–6s during SIN-edge spikes;
  // marketing/landing routes do not depend on the session, so we should not
  // pay that latency for visitors who never log in.
  if (!isProtected && !isAuthRoute) {
    return NextResponse.next({ request });
  }

  // Fast path #2: no auth cookie → user is definitely not logged in.
  // Skip the Supabase round-trip and act on the redirect rule directly.
  if (!hasAuthCookie(request)) {
    if (isProtected) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  // Has auth cookie → validate / refresh session via Supabase.
  const { supabaseResponse, user, authStatus } = await updateSession(request);

  // Fail-open on auth timeout/error — let client-side SupabaseProvider re-verify.
  // Only act on definitive results to prevent transient Supabase latency from
  // bouncing cookie-holding users to /login (= mobile background "force logout").
  if (authStatus === 'ok') {
    if (isProtected && !user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isAuthRoute && user) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      dashboardUrl.search = '';
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return supabaseResponse;
}

// Force Node.js runtime so we can rely on Fluid Compute instance reuse
// instead of the Edge runtime cold-start path.
export const runtime = 'nodejs';

export const config = {
  matcher: [
    /*
     * Match page routes only. Excludes:
     * - /api/*  → each API route runs its own withAuth(getUser); no need to
     *            double-hit Supabase from middleware. This was the main cause
     *            of MIDDLEWARE_INVOCATION_TIMEOUT under load.
     * - Next.js internals, static assets, PWA manifest, service worker, icons.
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|icons/|video/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|woff2?)$).*)',
  ],
};
