'use client';

import { useAuth } from '@/lib/context/AuthContext';
import { useTranslation } from '@/lib/context/I18nContext';

export function ModeToggle() {
  const { role, activeMode, setActiveMode } = useAuth();
  const { t } = useTranslation();

  // Only show toggle for admins
  if (role !== 'admin') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 bg-stone-100 rounded-lg p-1">
      <button
        onClick={() => setActiveMode('admin')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          activeMode === 'admin'
            ? 'bg-white text-stone-800 shadow-sm'
            : 'text-stone-500 hover:text-stone-700'
        }`}
      >
        {t('auth.adminMode')}
      </button>
      <button
        onClick={() => setActiveMode('user')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          activeMode === 'user'
            ? 'bg-white text-stone-800 shadow-sm'
            : 'text-stone-500 hover:text-stone-700'
        }`}
      >
        {t('auth.userMode')}
      </button>
    </div>
  );
}
