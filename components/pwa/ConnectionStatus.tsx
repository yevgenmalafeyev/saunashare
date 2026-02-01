'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/lib/context/I18nContext';

type ConnectionState = 'online' | 'no-internet' | 'server-down';

const CHECK_INTERVAL_MS = 10000; // Check every 10 seconds
const INTERNET_CHECK_URL = 'https://1.1.1.1/cdn-cgi/trace'; // Cloudflare - highly reliable
const SERVER_CHECK_URL = '/api/auth/role';

export function ConnectionStatus() {
  const { t } = useTranslation();
  const [connectionState, setConnectionState] = useState<ConnectionState>('online');
  const [isVisible, setIsVisible] = useState(false);

  const checkConnection = useCallback(async () => {
    // First, check if we have internet by pinging Cloudflare
    try {
      await fetch(INTERNET_CHECK_URL, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
      });
      // no-cors mode always returns opaque response, so we just check if it didn't throw
    } catch {
      // No internet connection
      setConnectionState('no-internet');
      setIsVisible(true);
      return;
    }

    // Internet is available, now check the application server
    try {
      const serverResponse = await fetch(SERVER_CHECK_URL, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });

      if (serverResponse.ok) {
        // Everything is fine
        setConnectionState('online');
        setIsVisible(false);
      } else {
        // Server responded but with an error
        setConnectionState('server-down');
        setIsVisible(true);
      }
    } catch {
      // Server is unreachable
      setConnectionState('server-down');
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    // Schedule initial check after mount to avoid synchronous setState
    const timeoutId = setTimeout(checkConnection, 0);

    // Set up periodic checking
    const intervalId = setInterval(checkConnection, CHECK_INTERVAL_MS);

    // Also listen to online/offline events for immediate feedback
    const handleOnline = () => {
      setTimeout(checkConnection, 0);
    };
    const handleOffline = () => {
      setConnectionState('no-internet');
      setIsVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/90 backdrop-blur-sm">
      <div className="mx-4 max-w-sm w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {connectionState === 'no-internet' ? (
          <>
            {/* No Internet Connection */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-7.072-7.072m7.072 7.072L6.343 17.657M8.464 8.464L6.343 6.343m0 0L3 3"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                {t('connection.noInternet')}
              </h2>
            </div>
            <div className="p-6 text-center">
              <p className="text-stone-600 mb-4">
                {t('connection.noInternetDesc')}
              </p>
              <div className="flex items-center justify-center gap-2 text-stone-400">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm">{t('connection.checking')}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Server Down */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">
                {t('connection.serverDown')}
              </h2>
            </div>
            <div className="p-6 text-center">
              <p className="text-stone-600 mb-4">
                {t('connection.serverDownDesc')}
              </p>
              <div className="flex items-center justify-center gap-2 text-stone-400">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-sm">{t('connection.checking')}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
