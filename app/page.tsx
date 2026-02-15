'use client';

import { SessionList } from '@/components/dashboard/SessionList';
import { CreateSessionButton } from '@/components/dashboard/CreateSessionButton';
import { UserDashboard } from '@/components/user';
import { ModeToggle, LanguageSwitcher } from '@/components/ui';
import { UsersIcon } from '@/components/ui/Icons';
import { useAuth } from '@/lib/context/AuthContext';
import { useTranslation } from '@/lib/context/I18nContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { role, activeMode } = useAuth();
  const { t } = useTranslation();

  const showAdminMode = role === 'admin' && activeMode === 'admin';

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky z-10 bg-stone-50/80 backdrop-blur-lg border-b border-stone-200" style={{ top: 'var(--tg-top-inset)' }}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-800">{t('dashboard.title')}</h1>
              <p className="text-stone-500 text-sm">{t('dashboard.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              {showAdminMode && (
                <Link
                  href="/members"
                  className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <UsersIcon className="w-5 h-5" />
                </Link>
              )}
              {/* Show ModeToggle for admins, LanguageSwitcher for users */}
              {role === 'admin' ? <ModeToggle /> : <LanguageSwitcher />}
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        {showAdminMode ? <SessionList /> : <UserDashboard />}
      </div>

      {showAdminMode && <CreateSessionButton />}
    </main>
  );
}
