'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { useTranslation } from '@/lib/context/I18nContext';
import { JSON_HEADERS } from '@/lib/constants';

interface PaymentButtonProps {
  sessionId: number;
  sessionParticipantId: number;
  initialHasPaid?: boolean;
  onPaymentChange?: (hasPaid: boolean) => void;
}

export function PaymentButton({
  sessionId,
  sessionParticipantId,
  initialHasPaid = false,
  onPaymentChange,
}: PaymentButtonProps) {
  const { t } = useTranslation();
  const [hasPaid, setHasPaid] = useState(initialHasPaid);
  const [isLoading, setIsLoading] = useState(false);

  const handleTogglePaid = async () => {
    setIsLoading(true);
    try {
      const newPaidStatus = !hasPaid;
      const res = await fetch(
        `/api/sessions/${sessionId}/participants/${sessionParticipantId}/payment`,
        {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ hasPaid: newPaidStatus }),
        }
      );

      if (res.ok) {
        setHasPaid(newPaidStatus);
        onPaymentChange?.(newPaidStatus);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      className={`w-full ${
        hasPaid
          ? 'bg-green-500 hover:bg-green-600'
          : 'bg-amber-500 hover:bg-amber-600'
      }`}
      size="lg"
      onClick={handleTogglePaid}
      disabled={isLoading}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      ) : hasPaid ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {t('user.markedPaid')}
        </span>
      ) : (
        t('user.markPaid')
      )}
    </Button>
  );
}
