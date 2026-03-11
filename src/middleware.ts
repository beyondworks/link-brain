import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_ROUTES = ['/dashboard', '/settings', '/studio', '/insights', '/admin', '/favorites', '/read-later', '/archive', '/collections', '/clip', '/graph', '/highlights'];
const AUTH_ROUTES = ['/login', '/signup'];
const ADMIN_ROUTES = ['/admin'];

function matchesRoutes(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = matchesRoutes(pathname, PROTECTED_ROUTES);
  const isAuthRoute = matchesRoutes(pathname, AUTH_ROUTES);
  const isAdminRoute = matchesRoutes(pathname, ADMIN_ROUTES);

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

  // Admin route — check role via user metadata
  if (isAdminRoute && user) {
    const role = (user.user_metadata as { role?: string } | undefined)?.role;
    if (role !== 'enterprise' && role !== 'admin') {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      dashboardUrl.search = '';
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and Next.js internals.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
