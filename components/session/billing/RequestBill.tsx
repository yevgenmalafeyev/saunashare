'use client';

import { useState, useEffect } from 'react';
import { Button, Spinner } from '@/components/ui';
import { FEEDBACK_TIMEOUT_MS } from '@/lib/constants';

interface RequestBillProps {
  sessionId: number;
}

interface SmsContact {
  phone: string;
  name: string;
}

const SMS_CONTACTS: SmsContact[] = [
  { phone: '+351924689616', name: 'Artur' },
  { phone: '+351963383623', name: 'Andrey' },
];

function SmsLink({ phone, name, body }: SmsContact & { body: string }) {
  return (
    <a
      href={`sms:${phone}?&body=${encodeURIComponent(body)}`}
      className="w-full block text-center font-medium rounded-xl transition-all duration-200 active:scale-95 bg-stone-200 text-stone-800 hover:bg-stone-300 active:bg-stone-400 px-6 py-3 text-lg"
    >
      <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      Text {name}
    </a>
  );
}

function copyToClipboard(text: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function RequestBill({ sessionId }: RequestBillProps) {
  const [billText, setBillText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/billing?type=request`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => data && setBillText(data.text))
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
            <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy to Clipboard
          </>
        )}
      </Button>

      {SMS_CONTACTS.map((contact) => (
        <SmsLink key={contact.phone} {...contact} body={billText} />
      ))}

      <p className="text-sm text-stone-500 text-center">
        Show this text to the sauna staff to get your bill
      </p>
    </div>
  );
}
