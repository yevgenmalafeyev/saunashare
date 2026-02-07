import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_TOKEN, USER_TOKEN, ROLE_COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/auth/constants';

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
  const { searchParams } = request.nextUrl;

  // Check for Telegram-specific query params
  const telegramParams = ['tg', 'tgWebAppStartParam', 'tgWebAppData', 'tgWebAppVersion', 'tgWebAppPlatform'];
  if (telegramParams.some(param => searchParams.has(param))) {
    return true;
  }

  // Check referer for Telegram
  const referer = request.headers.get('referer') || '';
  return referer.includes('telegram.org') || referer.includes('t.me');
}

function shouldSkipMiddleware(pathname: string): boolean {
  const skipPrefixes = ['/_next', '/api', '/favicon'];
  const skipExtensions = ['.ico', '.png', '.jpg', '.svg', '.json', '.js'];

  return (
    skipPrefixes.some(prefix => pathname.startsWith(prefix)) ||
    skipExtensions.some(ext => pathname.endsWith(ext)) ||
    pathname === '/forbidden'
  );
}

function validateToken(token: string): 'admin' | 'user' | null {
  if (token === ADMIN_TOKEN) return 'admin';
  if (token === USER_TOKEN) return 'user';
  return null;
}

function shouldUpgradeRole(currentRole: string | undefined, newRole: 'admin' | 'user'): boolean {
  return !currentRole || currentRole === 'none' || (currentRole === 'user' && newRole === 'admin');
}

function createCookieOptions(isHttps: boolean) {
  return {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isHttps,
    path: '/',
  };
}

function handleTokenWithRole(
  request: NextRequest,
  newRole: 'admin' | 'user',
  currentRole: string | undefined,
  inAppBrowser: boolean
): NextResponse {
  const shouldSet = shouldUpgradeRole(currentRole, newRole);
  const isHttps = request.nextUrl.protocol === 'https:';
  const cookieOptions = createCookieOptions(isHttps);

  if (shouldSet) {
    // For in-app browsers: set cookie but keep token in URL for shareability
    if (inAppBrowser) {
      const response = NextResponse.next();
      response.cookies.set(ROLE_COOKIE_NAME, newRole, cookieOptions);
      return response;
    }

    // Normal browser: remove token from URL and redirect with cookie
    const url = request.nextUrl.clone();
    url.searchParams.delete('token');
    const response = NextResponse.redirect(url);
    response.cookies.set(ROLE_COOKIE_NAME, newRole, cookieOptions);
    return response;
  }

  // Role doesn't need upgrade
  if (inAppBrowser) {
    return NextResponse.next();
  }

  // Normal browser: remove token from URL
  const url = request.nextUrl.clone();
  url.searchParams.delete('token');
  return NextResponse.redirect(url);
}

function isTelegramRequest(request: NextRequest): boolean {
  if (isTelegramMiniAppRequest(request)) return true;

  const userAgent = request.headers.get('user-agent') || '';
  return userAgent.toLowerCase().includes('telegram');
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }

  const token = searchParams.get('token');
  const currentRole = request.cookies.get(ROLE_COOKIE_NAME)?.value;

  // Handle token-based authentication
  if (token) {
    const newRole = validateToken(token);

    if (!newRole) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }

    const userAgent = request.headers.get('user-agent') || '';
    const inAppBrowser = isInAppBrowser(userAgent);

    return handleTokenWithRole(request, newRole, currentRole, inAppBrowser);
  }

  // No token - check existing authentication
  if (!currentRole || currentRole === 'none') {
    // Allow Telegram Mini App requests through for client-side authentication
    if (isTelegramRequest(request)) {
      return NextResponse.next();
    }

    // Allow root path through for Telegram Mini App detection
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
