import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow all next-auth routes to pass through
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthPage = pathname.startsWith('/login');

  if (isAuthPage) {
    // If the user is already logged in, redirect them from the login page to the dashboard
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    // Otherwise, allow them to see the login page
    return NextResponse.next();
  }

  // If there is no token and the path is not the login page, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control for authenticated users
  const role = token.role as string;

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (pathname.startsWith('/control') && !['admin', 'operator'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // If all checks pass, allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - and other static assets in /public
     */
    '/((?!_next/static|_next/image|favicon.ico|images|img|api/onboarding|api/logs/write).*)',
  ],
};