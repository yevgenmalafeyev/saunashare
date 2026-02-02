'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/context/I18nContext';
import { JSON_HEADERS } from '@/lib/constants';

interface DutyPersonSwitchProps {
  sessionId: number;
  onUpdate?: () => void;
}

type DutyPerson = 'artur' | 'andrey' | null;

export function DutyPersonSwitch({ sessionId, onUpdate }: DutyPersonSwitchProps) {
  const { t } = useTranslation();
  const [dutyPerson, setDutyPerson] = useState<DutyPerson>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((res) => res.json())
      .then((data) => setDutyPerson(data.dutyPerson))
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  const handleSelect = async (person: DutyPerson) => {
    if (person === dutyPerson) return;

    setDutyPerson(person);

    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ dutyPerson: person }),
    });

    if (res.ok) {
      onUpdate?.();
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="mt-6 pt-6 border-t border-stone-200">
      <div className="text-sm text-stone-500 mb-3 text-center">{t('session.dutyPerson')}</div>
      <div className="flex rounded-xl overflow-hidden border-2 border-stone-200">
        <button
          type="button"
          onClick={() => handleSelect('artur')}
          className={`flex-1 py-4 text-lg font-medium transition-colors ${
            dutyPerson === 'artur'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-stone-600 hover:bg-stone-50'
          }`}
        >
          Artur
        </button>
        <button
          type="button"
          onClick={() => handleSelect('andrey')}
          className={`flex-1 py-4 text-lg font-medium transition-colors border-l-2 border-stone-200 ${
            dutyPerson === 'andrey'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-stone-600 hover:bg-stone-50'
          }`}
        >
          Andrey
        </button>
      </div>
    </div>
  );
}
