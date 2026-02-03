import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROLE_COOKIE_NAME = 'banha-role';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Note: We can't use drizzle in middleware (edge runtime), so we use a simpler approach
// Tokens are validated by comparing with environment variables
// These should match the seeded values in app_config table
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'cd3d0ebea24eb99fc7e7c220207b1dec';
const USER_TOKEN = process.env.USER_TOKEN || 'f6b8fda5ba595d9233bc55f0675b2174';

/**
 * Detect if request is from an in-app browser (Telegram, etc.)
 * These browsers have sandboxed cookie storage that doesn't persist.
 */
function isInAppBrowser(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return (
    ua.includes('telegram') ||
    ua.includes('fban') ||
    ua.includes('fbav') ||
    ua.includes('instagram') ||
    // Generic WebView detection
    (ua.includes('wv)') && ua.includes('android'))
  );
}

/**
 * Detect if request might be from Telegram Mini App
 * Telegram Mini Apps inject tgWebAppData or send specific headers
 */
function isTelegramMiniAppRequest(request: NextRequest): boolean {
  const url = request.nextUrl;

  // Explicit Telegram Mini App marker (set in BotFather URL)
  if (url.searchParams.has('tg')) return true;

  // Telegram Mini App might have these query params
  if (url.searchParams.has('tgWebAppStartParam')) return true;
  if (url.searchParams.has('tgWebAppData')) return true;
  if (url.searchParams.has('tgWebAppVersion')) return true;
  if (url.searchParams.has('tgWebAppPlatform')) return true;

  // Check referer for Telegram
  const referer = request.headers.get('referer') || '';
  if (referer.includes('telegram.org') || referer.includes('t.me')) return true;

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.js') ||
    pathname === '/forbidden'
  ) {
    return NextResponse.next();
  }

  const token = searchParams.get('token');
  const currentRole = request.cookies.get(ROLE_COOKIE_NAME)?.value;

  // If token is provided, validate and set/upgrade role
  if (token) {
    let newRole: 'admin' | 'user' | null = null;

    if (token === ADMIN_TOKEN) {
      newRole = 'admin';
    } else if (token === USER_TOKEN) {
      newRole = 'user';
    }

    if (newRole) {
      // Check if we should upgrade or set the role
      const shouldSet =
        !currentRole ||
        currentRole === 'none' ||
        (currentRole === 'user' && newRole === 'admin');

      const userAgent = request.headers.get('user-agent') || '';
      const inAppBrowser = isInAppBrowser(userAgent);

      if (shouldSet) {
        const isHttps = request.nextUrl.protocol === 'https:';

        // For in-app browsers: set cookie but KEEP token in URL
        // This allows users to copy the full link with token
        if (inAppBrowser) {
          const response = NextResponse.next();
          response.cookies.set(ROLE_COOKIE_NAME, newRole, {
            maxAge: COOKIE_MAX_AGE,
            httpOnly: true,
            sameSite: 'lax',
            secure: isHttps,
            path: '/',
          });
          return response;
        }

        // Normal browser: remove token from URL and redirect with cookie
        const url = request.nextUrl.clone();
        url.searchParams.delete('token');
        const response = NextResponse.redirect(url);
        response.cookies.set(ROLE_COOKIE_NAME, newRole, {
          maxAge: COOKIE_MAX_AGE,
          httpOnly: true,
          sameSite: 'lax',
          secure: isHttps,
          path: '/',
        });
        return response;
      } else {
        // Role doesn't need upgrade
        // For in-app browsers, keep token in URL
        if (inAppBrowser) {
          return NextResponse.next();
        }
        // Normal browser: remove token from URL
        const url = request.nextUrl.clone();
        url.searchParams.delete('token');
        return NextResponse.redirect(url);
      }
    } else {
      // Invalid token
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  // No token provided - check if user has valid role
  if (!currentRole || currentRole === 'none') {
    // Allow Telegram Mini App requests through - they'll authenticate via client-side
    if (isTelegramMiniAppRequest(request)) {
      return NextResponse.next();
    }

    // Also check if this might be a Telegram Mini App based on user agent
    const userAgent = request.headers.get('user-agent') || '';
    if (userAgent.toLowerCase().includes('telegram')) {
      return NextResponse.next();
    }

    // Allow root path through - let client-side handle Telegram Mini App detection
    // This is needed because Telegram strips query parameters
    if (pathname === '/') {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL('/forbidden', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
