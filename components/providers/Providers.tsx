'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { AuthProvider, type UserRole } from '@/lib/context/AuthContext';
import { I18nProvider } from '@/lib/context/I18nContext';
import { InstallBanner } from '@/components/pwa/InstallBanner';
import { ConnectionStatus } from '@/components/pwa/ConnectionStatus';
import { TelegramBanner } from '@/components/TelegramBanner';
import { TokenRecovery } from '@/components/TokenRecovery';
import { TelegramProvider, isTelegramMiniApp } from '@/lib/telegram/context';
import { AccessDeniedWithTokenInput } from '@/components/auth/AccessDeniedWithTokenInput';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [role, setRole] = useState<UserRole>('none');
  const [isLoading, setIsLoading] = useState(true);
  // Check for Telegram - only runs on client due to isTelegramMiniApp checking window
  const [isTelegram] = useState(() => isTelegramMiniApp());
  const [telegramAuthComplete, setTelegramAuthComplete] = useState(false);
  const [telegramAccessDenied, setTelegramAccessDenied] = useState(false);

  // Handle Telegram auth completion
  const handleTelegramAuth = useCallback((newRole: 'admin' | 'user') => {
    setRole(newRole);
    setTelegramAuthComplete(true);
    setTelegramAccessDenied(false);
    setIsLoading(false);
  }, []);

  // Handle Telegram access denied
  const handleTelegramAccessDenied = useCallback(() => {
    setTelegramAccessDenied(true);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Skip if in Telegram - auth is handled by TelegramProvider
    if (isTelegram) {
      return;
    }

    // Regular browser flow - fetch role from cookie
    fetch('/api/auth/role')
      .then((res) => res.json())
      .then((data) => {
        setRole(data.role || 'none');
      })
      .catch(() => {
        setRole('none');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isTelegram]);

  // Redirect to forbidden if not in Telegram and not authenticated
  useEffect(() => {
    if (!isTelegram && role === 'none' && !isLoading) {
      if (window.location.pathname !== '/forbidden') {
        window.location.href = '/forbidden';
      }
    }
  }, [isTelegram, role, isLoading]);

  // Show loading spinner while determining auth state
  if (isLoading && !isTelegram) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  // Show loading while redirecting to forbidden
  if (!isTelegram && role === 'none' && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  // For Telegram Mini App
  if (isTelegram) {
    return (
      <TelegramProvider onAuthComplete={handleTelegramAuth} onAccessDenied={handleTelegramAccessDenied}>
        <I18nProvider>
          {telegramAccessDenied ? (
            // Show access denied with token input for Telegram users
            <AccessDeniedWithTokenInput isTelegram={true} />
          ) : !telegramAuthComplete ? (
            // Show loading while authenticating with Telegram
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent mx-auto mb-4" />
                <p className="text-stone-500 text-sm">Authenticating...</p>
              </div>
            </div>
          ) : (
            <AuthProvider initialRole={role}>
              <ConnectionStatus />
              {children}
            </AuthProvider>
          )}
        </I18nProvider>
      </TelegramProvider>
    );
  }

  // Regular browser/PWA flow
  return (
    <>
      <TokenRecovery />
      <I18nProvider>
        <TelegramBanner />
        <AuthProvider initialRole={role}>
          <ConnectionStatus />
          <InstallBanner />
          {children}
        </AuthProvider>
      </I18nProvider>
    </>
  );
}
