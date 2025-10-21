import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith('/login');
  const isApiAuthRoute = pathname.startsWith('/api/auth');

  // Allow NextAuth API routes to be accessed
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // If the user is on the login page
  if (isAuthPage) {
    if (token) {
      // If authenticated, redirect to their role-based home page
      const userRole = token.role as string;
      let url = '/dashboard'; // Default
      if (userRole === 'admin') url = '/admin';
      else if (userRole === 'operator') url = '/control';
      return NextResponse.redirect(new URL(url, req.url));
    }
    // If not authenticated, allow them to see the login page
    return NextResponse.next();
  }

  // For all other routes, check for a token
  if (!token) {
    // If no token, redirect to the login page
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If authenticated and trying to access the root, redirect based on role
  if (pathname === '/') {
      const userRole = token.role as string;
      let url = '/dashboard';
      if (userRole === 'admin') url = '/admin';
      else if (userRole === 'operator') url = '/control';
      return NextResponse.redirect(new URL(url, req.url));
  }

  // Role-based access control for protected routes
  const userRole = token.role as string;
  const roleProtectedRoutes: Record<string, string[]> = {
    admin: ['/admin', '/control', '/maintenance'],
    operator: ['/control', '/maintenance'],
  };

  const requiredRoles = Object.keys(roleProtectedRoutes).filter(role =>
    roleProtectedRoutes[role].some(p => pathname.startsWith(p))
  );

  if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/logs|api/backup|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)',
  ],
};