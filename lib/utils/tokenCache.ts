/**
 * Token persistence using Cache API
 *
 * The Cache API is sometimes shared between Safari and PWA on iOS,
 * making it useful for transferring authentication tokens across browser contexts.
 */

const TOKEN_CACHE_NAME = 'banha-token-v1';
const TOKEN_CACHE_URL = '/token-cache';
const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface CachedToken {
  token: string;
  timestamp: number;
}

function isCacheAvailable(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

function isTokenExpired(timestamp: number): boolean {
  return Date.now() - timestamp > TOKEN_MAX_AGE_MS;
}

/**
 * Store a token in the Cache API
 */
export async function storeTokenInCache(token: string): Promise<boolean> {
  if (!isCacheAvailable()) {
    return false;
  }

  try {
    const cache = await caches.open(TOKEN_CACHE_NAME);
    const data: CachedToken = {
      token,
      timestamp: Date.now(),
    };

    // Store as a fake response - Cache API requires Request/Response pairs
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });

    await cache.put(TOKEN_CACHE_URL, response);
    return true;
  } catch (error) {
    console.error('Failed to store token in cache:', error);
    return false;
  }
}

/**
 * Retrieve a token from the Cache API
 */
export async function getTokenFromCache(): Promise<string | null> {
  if (!isCacheAvailable()) {
    return null;
  }

  try {
    const cache = await caches.open(TOKEN_CACHE_NAME);
    const response = await cache.match(TOKEN_CACHE_URL);

    if (!response) {
      return null;
    }

    const data: CachedToken = await response.json();

    if (isTokenExpired(data.timestamp)) {
      await clearTokenCache();
      return null;
    }

    return data.token;
  } catch (error) {
    console.error('Failed to get token from cache:', error);
    return null;
  }
}

/**
 * Clear the token cache
 */
export async function clearTokenCache(): Promise<void> {
  if (!isCacheAvailable()) {
    return;
  }

  try {
    await caches.delete(TOKEN_CACHE_NAME);
  } catch (error) {
    console.error('Failed to clear token cache:', error);
  }
}

/**
 * Store token in localStorage as additional backup
 */
export function storeTokenInLocalStorage(token: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('banha-auth-token', JSON.stringify({
      token,
      timestamp: Date.now(),
    }));
  } catch {
    // localStorage might be disabled
  }
}

/**
 * Get token from localStorage
 */
export function getTokenFromLocalStorage(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('banha-auth-token');
    if (!stored) return null;

    const data = JSON.parse(stored);

    if (isTokenExpired(data.timestamp)) {
      localStorage.removeItem('banha-auth-token');
      return null;
    }

    return data.token;
  } catch {
    return null;
  }
}
