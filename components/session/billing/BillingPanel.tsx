'use client';

import { useState } from 'react';
import { RequestBill } from './RequestBill';
import { MatchBill } from './MatchBill';
import { IssueBill } from './IssueBill';
import { useTranslation } from '@/lib/context/I18nContext';

interface BillingPanelProps {
  sessionId: number;
  onUpdate: () => void;
  initialMode?: 'request' | 'match' | 'issue';
}

type BillingMode = 'request' | 'match' | 'issue';

export function BillingPanel({ sessionId, onUpdate, initialMode = 'request' }: BillingPanelProps) {
  const { t } = useTranslation();
  const [mode, setModeState] = useState<BillingMode>(initialMode);

  const setMode = (newMode: BillingMode) => {
    setModeState(newMode);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', newMode);
    window.history.replaceState({}, '', url.toString());
  };

  const modes = [
    { id: 'request', label: t('billing.request'), icon: '📝' },
    { id: 'match', label: t('billing.match'), icon: '📷' },
    { id: 'issue', label: t('billing.issue'), icon: '💰' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
              mode === m.id
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <span className="mr-1">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'request' && <RequestBill sessionId={sessionId} />}
      {mode === 'match' && <MatchBill sessionId={sessionId} onUpdate={onUpdate} onApplied={() => setMode('issue')} />}
      {mode === 'issue' && <IssueBill sessionId={sessionId} onUpdate={onUpdate} />}
    </div>
  );
}
