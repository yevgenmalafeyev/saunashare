'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/context/I18nContext';

interface ContactButtonsProps {
  dutyPerson: 'artur' | 'andrey' | null;
}

export function ContactButtons({ dutyPerson }: ContactButtonsProps) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!dutyPerson) return;

    fetch(`/api/config?key=${dutyPerson}-phone`)
      .then((res) => res.json())
      .then((data) => setPhone(data.value))
      .catch(() => setPhone(null));
  }, [dutyPerson]);

  if (!dutyPerson || !phone) {
    return null;
  }

  const dutyPersonName = dutyPerson.charAt(0).toUpperCase() + dutyPerson.slice(1);

  return (
    <div className="space-y-2">
      <p className="text-sm text-stone-500 text-center">
        {t('user.contactDutyPerson')}: {dutyPersonName}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`tel:${phone}`}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          {t('user.call')}
        </a>
        <a
          href={`sms:${phone}`}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {t('user.message')}
        </a>
      </div>
    </div>
  );
}
