import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  console.log(`[Middleware] Path: ${pathname}, Token: ${token ? 'Exists' : 'None'}`);

  const isAuthRelated = pathname.startsWith('/login') || pathname.startsWith('/api/auth');

  // Allow NextAuth API routes to be accessed
  if (pathname.startsWith('/api/auth')) {
    console.log('[Middleware] Allowing API auth route');
    return NextResponse.next();
  }

  // If the user is authenticated
  if (token) {
    const userRole = token.role as string;
    let targetUrl = '/dashboard';
    if (userRole === 'admin') targetUrl = '/admin';
    else if (userRole === 'operator') targetUrl = '/control';

    // If on the login page or root, redirect to the role-based home page
    if (pathname.startsWith('/login') || pathname === '/') {
      console.log(`[Middleware] Authenticated user on login/root, redirecting to ${targetUrl}`);
      return NextResponse.redirect(new URL(targetUrl, req.url));
    }

    // Role-based access control for protected routes
    const roleProtectedRoutes: Record<string, string[]> = {
      admin: ['/admin', '/control', '/maintenance'],
      operator: ['/control', '/maintenance'],
    };

    const requiresAuth = Object.values(roleProtectedRoutes).flat().some(p => pathname.startsWith(p));

    if(requiresAuth){
        const allowedRoles = Object.keys(roleProtectedRoutes).filter(role =>
            roleProtectedRoutes[role].some(p => pathname.startsWith(p))
        );
        if(!allowedRoles.includes(userRole)){
            console.log(`[Middleware] Unauthorized access attempt by ${userRole} to ${pathname}`);
            return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
    }

  } else {
    // If not authenticated and not on a public page, redirect to login
    if (!isAuthRelated && pathname !== '/') {
      console.log('[Middleware] Unauthenticated user, redirecting to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  console.log('[Middleware] Allowing request');
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/logs|api/backup|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$).*)',
  ],
};