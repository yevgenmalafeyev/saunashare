'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { TabBar, FloatingButton } from '@/components/ui';
import { ParticipantList } from './participants/ParticipantList';
import { ExpenseList } from './expenses/ExpenseList';
import { BillingPanel } from './billing/BillingPanel';

interface SessionTabsProps {
  sessionId: number;
}

const tabs = [
  {
    id: 'participants',
    label: 'Participants',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

export function SessionTabs({ sessionId }: SessionTabsProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'participants';
  const [refreshKey, setRefreshKey] = useState(0);
  const [billingReady, setBillingReady] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    window.addEventListener('participantChange', handleRefresh);
    return () => window.removeEventListener('participantChange', handleRefresh);
  }, [handleRefresh]);

  // Check billing status for participants tab (to enable payment toggle) and billing tab
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sessions/${sessionId}/billing?type=calculate`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!cancelled) {
          setBillingReady(data?.ready ?? false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBillingReady(false);
        }
      });

    return () => { cancelled = true; };
  }, [sessionId, refreshKey]);

  return (
    <div className="flex flex-col">
      <div className="sticky top-[73px] z-10 bg-stone-50 pb-4 -mx-4 px-4 -mt-4 pt-4">
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      <div className="flex-1">
        {activeTab === 'participants' && (
          <ParticipantList key={refreshKey} sessionId={sessionId} onUpdate={handleRefresh} billingReady={billingReady} />
        )}
        {activeTab === 'expenses' && (
          <ExpenseList key={refreshKey} sessionId={sessionId} onUpdate={handleRefresh} />
        )}
        {activeTab === 'billing' && (
          <BillingPanel
            key={refreshKey}
            sessionId={sessionId}
            onUpdate={handleRefresh}
            initialMode={(searchParams.get('mode') as 'request' | 'match' | 'issue') || 'request'}
          />
        )}
      </div>

      {activeTab === 'billing' && searchParams.get('mode') === 'issue' && billingReady && (
        <FloatingButton
          onClick={() => { window.location.href = `/session/${sessionId}/billing/display`; }}
          storageKey="tv-display-fab-position"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        </FloatingButton>
      )}
    </div>
  );
}
