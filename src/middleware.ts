import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_ROUTES = ['/dashboard', '/settings', '/studio', '/insights', '/admin', '/favorites', '/read-later', '/archive', '/collections', '/clip', '/graph', '/highlights'];
const AUTH_ROUTES = ['/login', '/signup'];

function matchesRoutes(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'),
  );
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

  // Has auth cookie → must validate / refresh session via Supabase.
  const { supabaseResponse, user } = await updateSession(request);

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

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and Next.js internals.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/internal|api/webhooks|manifest\\.json|sw\\.js|icons/|video/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|woff2?)$).*)',
  ],
};
