// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This is a very basic check using a cookie. For IndexedDB, checking must happen client-side.
// A common pattern is to set a cookie when onboarding is complete.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Assume you set a cookie 'onboarding_completed=true' after successful onboarding in idb-store.ts or OnboardingContext.
  // const isOnboardingCompleted = request.cookies.get('onboarding_completed')?.value === 'true';

  // Since isOnboardingComplete relies on IndexedDB which isn't available in middleware,
  // client-side redirection within the page/layout is more reliable.
  // This middleware is more for paths that *require* auth after login.
  // For initial onboarding check, page-level or layout-level client-side useEffect is best.

  // Example: Protect /dashboard if no user session cookie exists
  // const sessionToken = request.cookies.get('session_token')?.value;
  // if (pathname.startsWith('/dashboard') && !sessionToken) {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

  // For initial redirect TO onboarding or TO login:
  // If you stored onboarding status in a cookie:
  // if (!isOnboardingCompleted && pathname !== '/onboarding' && !pathname.startsWith('/_next') && !pathname.startsWith('/api')) {
  //    return NextResponse.redirect(new URL('/onboarding', request.url));
  // }
  // if (isOnboardingCompleted && pathname === '/onboarding') {
  //    return NextResponse.redirect(new URL('/login', request.url));
  // }

  return NextResponse.next();
}

// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - api (API routes)
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      * - AV_Icon.ico (logo file in public)
//      */
//     '/((?!api|_next/static|_next/image|favicon.ico|AV_Icon.ico).*)',
//   ],
// };