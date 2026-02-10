/**
 * Browser detection utilities for handling in-app browsers and PWA mode
 */

function getUserAgent(): string {
  if (typeof window === 'undefined') return '';
  return navigator.userAgent || navigator.vendor || '';
}

function testUserAgent(pattern: RegExp): boolean {
  return pattern.test(getUserAgent());
}

export function isTelegramBrowser(): boolean {
  return testUserAgent(/Telegram/i);
}

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;

  // iOS Safari standalone
  if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone) {
    return true;
  }

  // Modern browsers (Android Chrome, etc)
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function isIOS(): boolean {
  return testUserAgent(/iPhone|iPad|iPod/i);
}

export function isAndroid(): boolean {
  return testUserAgent(/Android/i);
}

/**
 * Generate a URL that attempts to open in the system browser
 */
export function getSystemBrowserUrl(url: string): string {
  // On Android, we can try intent:// to open in Chrome
  if (isAndroid()) {
    const urlObj = new URL(url);
    // intent://host/path#Intent;scheme=https;package=com.android.chrome;end
    return `intent://${urlObj.host}${urlObj.pathname}${urlObj.search}#Intent;scheme=${urlObj.protocol.replace(':', '')};package=com.android.chrome;end`;
  }

  // On iOS, there's no reliable way to force Safari, just return the URL
  return url;
}
