'use client';

import { useState } from 'react';
import { Button, CheckCircleIcon, LoadingSpinnerIcon } from '@/components/ui';
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
        <LoadingSpinnerIcon />
      ) : hasPaid ? (
        <span className="flex items-center justify-center gap-2">
          <CheckCircleIcon className="w-5 h-5" />
          {t('user.markedPaid')}
        </span>
      ) : (
        t('user.markPaid')
      )}
    </Button>
  );
}
