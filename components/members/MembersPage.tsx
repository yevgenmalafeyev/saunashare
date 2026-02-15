'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@/components/ui/Icons';
import { useAuth } from '@/lib/context/AuthContext';
import { useTranslation } from '@/lib/context/I18nContext';
import { MemberCard } from './MemberCard';
import type { Member } from '@/lib/types';

export function MembersPage() {
  const router = useRouter();
  const { role, activeMode } = useAuth();
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect non-admins
  useEffect(() => {
    if (role !== 'admin' || activeMode !== 'admin') {
      router.replace('/');
    }
  }, [role, activeMode, router]);

  const fetchMembers = useCallback(() => {
    fetch('/api/members')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setMembers(data);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  if (role !== 'admin' || activeMode !== 'admin') return null;

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-stone-50/80 backdrop-blur-lg border-b border-stone-200">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 -ml-2 text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-stone-800">{t('members.title')}</h1>
              <p className="text-stone-500 text-sm">{t('members.subtitle')}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        {isLoading ? (
          <p className="text-center text-stone-400 py-8">{t('common.loading')}</p>
        ) : members.length === 0 ? (
          <p className="text-center text-stone-400 py-8">{t('members.noMembers')}</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} onRefresh={fetchMembers} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
