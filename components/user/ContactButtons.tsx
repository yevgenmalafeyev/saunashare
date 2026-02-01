'use client';

import { useState, useEffect } from 'react';
import { PhoneIcon, MessageIcon } from '@/components/ui';
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
          <PhoneIcon />
          {t('user.call')}
        </a>
        <a
          href={`sms:${phone}`}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
        >
          <MessageIcon />
          {t('user.message')}
        </a>
      </div>
    </div>
  );
}
