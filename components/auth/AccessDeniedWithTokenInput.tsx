'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/context/I18nContext';
import { useTelegram } from '@/hooks/useTelegram';
import { Button, Input } from '@/components/ui';

interface AccessDeniedWithTokenInputProps {
  isTelegram?: boolean;
}

export function AccessDeniedWithTokenInput({ isTelegram = false }: AccessDeniedWithTokenInputProps) {
  const { t } = useTranslation();
  const { submitManualToken } = useTelegram();
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      if (isTelegram) {
        // For Telegram users, use the Telegram context
        const success = await submitManualToken(token.trim());
        if (!success) {
          setError(t('auth.invalidToken'));
        }
        // If successful, the TelegramProvider will handle the redirect
      } else {
        // For regular web users, redirect with token in URL
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('token', token.trim());
        // Remove /forbidden from path if present
        if (currentUrl.pathname === '/forbidden') {
          currentUrl.pathname = '/';
        }
        window.location.href = currentUrl.toString();
      }
    } catch {
      setError(t('auth.invalidToken'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="text-center max-w-sm w-full">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">
          {t('auth.forbidden')}
        </h1>
        <p className="text-stone-500 mb-6">{t('auth.forbiddenDesc')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('auth.enterToken')}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={t('auth.tokenPlaceholder')}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
          />

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!token.trim() || isSubmitting}
          >
            {isSubmitting ? t('common.loading') : t('auth.submit')}
          </Button>
        </form>

        <p className="text-sm text-stone-400 mt-6">{t('auth.contactAdmin')}</p>
      </div>
    </main>
  );
}
