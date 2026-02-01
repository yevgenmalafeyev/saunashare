'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Input, Button, FloatingButton } from '@/components/ui';
import { formatSessionDate } from '@/lib/utils/billing';
import { JSON_HEADERS } from '@/lib/constants';
import { useTranslation } from '@/lib/context/I18nContext';

type DutyPerson = 'artur' | 'andrey';

export function CreateSessionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [dutyPerson, setDutyPerson] = useState<DutyPerson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleOpen = () => {
    setName(formatSessionDate(new Date()));
    setDutyPerson(null);
    setIsOpen(true);
  };

  const handleCreate = async () => {
    if (!name.trim() || !dutyPerson) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: name.trim(), dutyPerson }),
      });

      if (res.ok) {
        const session = await res.json();
        router.push(`/session/${session.id}`);
      }
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <FloatingButton onClick={handleOpen} storageKey="fab-sessions" />

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('dashboard.newSession')}>
        <div className="space-y-4">
          <Input
            label={t('session.sessionName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Jan 15"
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {t('session.dutyPerson')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDutyPerson('artur')}
                className={`py-3 px-4 rounded-xl border-2 font-medium transition-colors ${
                  dutyPerson === 'artur'
                    ? 'border-amber-500 bg-amber-50 text-amber-800'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                }`}
              >
                Artur
              </button>
              <button
                type="button"
                onClick={() => setDutyPerson('andrey')}
                className={`py-3 px-4 rounded-xl border-2 font-medium transition-colors ${
                  dutyPerson === 'andrey'
                    ? 'border-amber-500 bg-amber-50 text-amber-800'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                }`}
              >
                Andrey
              </button>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleCreate}
            disabled={!name.trim() || !dutyPerson || isLoading}
          >
            {isLoading ? t('dashboard.creating') : t('dashboard.createSession')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
