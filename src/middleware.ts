import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_ROUTES = ['/dashboard', '/settings', '/studio', '/insights', '/admin', '/favorites', '/read-later', '/archive', '/collections', '/clip', '/graph', '/highlights'];
const AUTH_ROUTES = ['/login', '/signup'];

function matchesRoutes(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, authStatus } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = matchesRoutes(pathname, PROTECTED_ROUTES);
  const isAuthRoute = matchesRoutes(pathname, AUTH_ROUTES);

  // Fail-open on auth timeout/error — let client-side SupabaseProvider re-verify.
  // Only act on definitive results to prevent transient Supabase latency from
  // bouncing users to /login (= mobile background "force logout" symptom).
  if (authStatus === 'ok') {
    // Unauthenticated user trying to access protected route
    if (isProtected && !user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated user on auth pages → send to dashboard
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
