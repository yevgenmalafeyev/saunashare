'use client';

import { useState, useEffect } from 'react';
import { Button, Spinner, CheckIcon, CopyIcon } from '@/components/ui';
import { useTranslation } from '@/lib/context/I18nContext';
import { FEEDBACK_TIMEOUT_MS } from '@/lib/constants';

interface RequestBillProps {
  sessionId: number;
}

interface SmsContact {
  phone: string;
  name: string;
  key: string;
}

const SMS_CONTACTS: SmsContact[] = [
  { phone: '+351924689616', name: 'Artur', key: 'artur' },
  { phone: '+351963383623', name: 'Andrey', key: 'andrey' },
];

function SmsLink({ phone, body, label }: Omit<SmsContact, 'name' | 'key'> & { body: string; label: string }) {
  return (
    <a
      href={`sms:${phone}?&body=${encodeURIComponent(body)}`}
      className="w-full block text-center font-medium rounded-xl transition-all duration-200 active:scale-95 bg-stone-200 text-stone-800 hover:bg-stone-300 active:bg-stone-400 px-6 py-3 text-lg"
    >
      <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      {label}
    </a>
  );
}

async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function RequestBill({ sessionId }: RequestBillProps) {
  const { t } = useTranslation();
  const [billText, setBillText] = useState('');
  const [dutyPerson, setDutyPerson] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/sessions/${sessionId}/billing?type=request`).then((res) => res.ok ? res.json() : null),
      fetch(`/api/sessions/${sessionId}`).then((res) => res.ok ? res.json() : null),
    ])
      .then(([billingData, sessionData]) => {
        if (billingData) setBillText(billingData.text);
        if (sessionData) setDutyPerson(sessionData.dutyPerson);
      })
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  const handleCopy = () => {
    copyToClipboard(billText);
    setCopied(true);
    setTimeout(() => setCopied(false), FEEDBACK_TIMEOUT_MS);
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
        <p className="text-lg text-stone-800 leading-relaxed">{billText}</p>
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={handleCopy}
        variant={copied ? 'secondary' : 'primary'}
      >
        {copied ? (
          <>
            <CheckIcon className="w-5 h-5 mr-2 inline" />
            {t('billing.copied')}
          </>
        ) : (
          <>
            <CopyIcon className="w-5 h-5 mr-2 inline" />
            {t('billing.copyToClipboard')}
          </>
        )}
      </Button>

      {SMS_CONTACTS
        .filter((contact) => !dutyPerson || contact.key === dutyPerson)
        .map((contact) => (
          <SmsLink
            key={contact.phone}
            phone={contact.phone}
            body={billText}
            label={t('billing.textPerson', { name: contact.name })}
          />
        ))}

      <p className="text-sm text-stone-500 text-center">
        {t('billing.showBillText')}
      </p>
    </div>
  );
}
