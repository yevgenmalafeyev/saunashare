'use client';

import Link from 'next/link';
import { SessionTabs } from './SessionTabs';
import { UserSessionView } from '@/components/user';
import { ArrowLeftIcon, LanguageSwitcher } from '@/components/ui';
import { useAuth } from '@/lib/context/AuthContext';

interface SessionPageContentProps {
  sessionId: number;
  sessionName: string;
}

export function SessionPageContent({ sessionId, sessionName }: SessionPageContentProps) {
  const { role, activeMode } = useAuth();

  const showAdminMode = role === 'admin' && activeMode === 'admin';

  return (
    <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-stone-50/80 backdrop-blur-lg border-b border-stone-200">
        <div className="px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 -ml-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-stone-800">{sessionName}</h1>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="flex-1 px-4 py-4">
        {showAdminMode ? (
          <SessionTabs sessionId={sessionId} />
        ) : (
          <UserSessionView sessionId={sessionId} />
        )}
      </div>
    </main>
  );
}
