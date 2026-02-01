'use client';

import { useTranslation } from '@/lib/context/I18nContext';

export default function ForbiddenPage() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">
          {t('auth.forbidden')}
        </h1>
        <p className="text-stone-500 mb-6">{t('auth.forbiddenDesc')}</p>
        <p className="text-sm text-stone-400">{t('auth.contactAdmin')}</p>
      </div>
    </main>
  );
}
