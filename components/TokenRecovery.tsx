'use client';

import { useEffect, useRef } from 'react';
import {
  getTokenFromCache,
  getTokenFromLocalStorage,
  storeTokenInCache,
  storeTokenInLocalStorage,
} from '@/lib/utils/tokenCache';
import { isStandaloneMode } from '@/lib/utils/browserDetection';

/**
 * TokenRecovery component handles:
 * 1. Saving token to Cache API and localStorage when present in URL (for cross-browser recovery)
 * 2. Recovering auth by redirecting with cached token if cookie is missing
 *
 * This helps with:
 * - Safari → PWA token transfer on iOS (via Cache API)
 * - Telegram browser → system browser transfer
 */
export function TokenRecovery() {
  const hasAttemptedRecovery = useRef(false);

  useEffect(() => {
    if (hasAttemptedRecovery.current) return;
    hasAttemptedRecovery.current = true;

    const handleTokenRecovery = async () => {
      const url = new URL(window.location.href);
      const tokenInUrl = url.searchParams.get('token');

      // If token is in URL, save it to cache for future recovery
      if (tokenInUrl) {
        await storeTokenInCache(tokenInUrl);
        storeTokenInLocalStorage(tokenInUrl);
        return; // Middleware will handle the redirect
      }

      // Check if we're on the forbidden page (meaning no valid cookie)
      const onForbiddenPage = window.location.pathname === '/forbidden';

      // Only attempt recovery if we're on forbidden page or in standalone mode
      // (PWA might have lost its cookie but have cache)
      if (!onForbiddenPage && !isStandaloneMode()) {
        return;
      }

      // Try to recover token from cache or localStorage
      let cachedToken = await getTokenFromCache();
      if (!cachedToken) {
        cachedToken = getTokenFromLocalStorage();
      }

      if (cachedToken) {
        // Redirect to home with token to re-authenticate
        const recoveryUrl = new URL('/', window.location.origin);
        recoveryUrl.searchParams.set('token', cachedToken);
        window.location.href = recoveryUrl.toString();
      }
    };

    handleTokenRecovery();
  }, []);

  return null;
}
