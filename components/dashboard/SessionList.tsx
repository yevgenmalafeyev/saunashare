'use client';

import { useState, useEffect, useCallback } from 'react';
import { SessionCard } from './SessionCard';
import { SwipeableRow, Spinner, Button } from '@/components/ui';
import { useTranslation } from '@/lib/context/I18nContext';
import { JSON_HEADERS } from '@/lib/constants';

interface Session {
  id: number;
  name: string;
  hidden: boolean;
  createdAt: string;
  participantCount: number;
}

export function SessionList() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [showHidden, setShowHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const url = showHidden ? '/api/sessions?includeHidden=true' : '/api/sessions';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // API now always returns { sessions, hiddenCount }
        setSessions(data.sessions);
        setHiddenCount(data.hiddenCount);
      }
    } finally {
      setIsLoading(false);
    }
  }, [showHidden]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleToggleHidden = async (sessionId: number, hidden: boolean) => {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ hidden }),
    });

    if (res.ok) {
      fetchSessions();
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  const visibleSessions = sessions.filter(s => !s.hidden);
  const hiddenSessions = sessions.filter(s => s.hidden);

  if (sessions.length === 0 && hiddenCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-stone-700 mb-2">{t('dashboard.noSessions')}</h3>
        <p className="text-stone-500">{t('dashboard.noSessionsDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Visible sessions */}
      {visibleSessions.map((session) => (
        <SwipeableRow
          key={session.id}
          onAction={() => handleToggleHidden(session.id, true)}
          actionLabel={t('common.hide')}
          actionColor="amber"
        >
          <SessionCard
            id={session.id}
            name={session.name}
            createdAt={new Date(session.createdAt)}
            participantCount={session.participantCount}
          />
        </SwipeableRow>
      ))}

      {/* Show hidden button */}
      {!showHidden && hiddenCount > 0 && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => setShowHidden(true)}
        >
          {hiddenCount === 1
            ? t('dashboard.showHidden', { count: hiddenCount })
            : t('dashboard.showHiddenPlural', { count: hiddenCount })}
        </Button>
      )}

      {/* Hidden sessions */}
      {showHidden && hiddenSessions.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-4">
            <div className="flex-1 h-px bg-stone-300" />
            <span className="text-sm text-stone-500">{t('dashboard.hiddenSessions')}</span>
            <div className="flex-1 h-px bg-stone-300" />
          </div>

          {hiddenSessions.map((session) => (
            <SwipeableRow
              key={session.id}
              onAction={() => handleToggleHidden(session.id, false)}
              actionLabel={t('common.unhide')}
              actionColor="amber"
            >
              <div className="opacity-60">
                <SessionCard
                  id={session.id}
                  name={session.name}
                  createdAt={new Date(session.createdAt)}
                  participantCount={session.participantCount}
                />
              </div>
            </SwipeableRow>
          ))}

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setShowHidden(false)}
          >
            {t('dashboard.hideHidden')}
          </Button>
        </>
      )}
    </div>
  );
}
