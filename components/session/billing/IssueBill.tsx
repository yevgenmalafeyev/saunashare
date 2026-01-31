'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui';
import type { ParticipantBill } from '@/lib/types';

interface BillingStatus {
  ready: boolean;
  issues: string[];
  bills: ParticipantBill[];
  grandTotal: number;
  expenseTotal: number;
  balance: number;
}

interface IssueBillProps {
  sessionId: number;
}

export function IssueBill({ sessionId }: IssueBillProps) {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/billing?type=calculate`)
      .then((res) => res.ok ? res.json() : null)
      .then(setStatus)
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  if (isLoading) {
    return <Spinner />;
  }

  if (!status) {
    return (
      <div className="text-center py-8 text-stone-500">
        Failed to load billing information.
      </div>
    );
  }

  if (!status.ready) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="font-medium text-amber-800 mb-2">Cannot Issue Bill Yet</div>
          <ul className="list-disc list-inside text-amber-700 space-y-1">
            {status.issues.map((issue, idx) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {status.bills.map((bill) => (
          <div
            key={bill.participantId}
            className="bg-white border border-stone-200 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-lg text-stone-800">
                {bill.participantName}
                {bill.personCount > 1 && (
                  <span className="text-stone-400 font-normal text-sm ml-1">
                    ({bill.personCount})
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-amber-600">
                {bill.total} €
              </div>
            </div>
            <div className="text-sm text-stone-500 space-y-0.5">
              {bill.breakdown.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.expenseName} ×{item.share}</span>
                  <span>{item.cost.toFixed(0)} €</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Общак - rounding balance styled like a participant */}
        {status.balance !== 0 && (
          <div
            className={`rounded-xl p-4 ${
              status.balance > 0
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`font-bold text-lg ${status.balance > 0 ? 'text-green-800' : 'text-red-800'}`}>
                Общак
              </div>
              <div className={`text-xl font-bold ${status.balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {status.balance > 0 ? '+' : ''}{status.balance} €
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-amber-100 border border-amber-300 rounded-xl p-4 flex items-center justify-between">
        <span className="font-bold text-amber-800">Grand Total</span>
        <span className="text-2xl font-bold text-amber-800">{status.expenseTotal} €</span>
      </div>
    </div>
  );
}
