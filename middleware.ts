import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export const config = {
  matcher: ['/((?!api/auth/login|_next/static|_next/image|favicon.ico|images|login).*)'],
};

const publicPaths = [
  '/',
  '/onboarding',
  '/terms-of-service',
  '/privacy-policy',
  '/api/onboarding',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url);
  }

  const role = token.role as string;

  if (pathname.startsWith('/admin') && role !== 'admin') {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/control') && !['admin', 'operator'].includes(role)) {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}