'use client';

import { useState, useEffect, useCallback } from 'react';
import { Spinner, Button } from '@/components/ui';
import { JSON_HEADERS } from '@/lib/constants';
import type { ParticipantBill } from '@/lib/types';

interface ParticipantBillWithPayment extends ParticipantBill {
  hasPaid?: boolean;
}

interface MissingCostExpense {
  id: number;
  name: string;
  itemCount: number;
}

interface BillingStatus {
  ready: boolean;
  issues: string[];
  bills: ParticipantBillWithPayment[];
  grandTotal: number;
  expenseTotal: number;
  balance: number;
  missingCostExpenses: MissingCostExpense[];
}

interface IssueBillProps {
  sessionId: number;
  onUpdate?: () => void;
}

export function IssueBill({ sessionId, onUpdate }: IssueBillProps) {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [costs, setCosts] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchStatus = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/sessions/${sessionId}/billing?type=calculate`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        setStatus(data);
        // Initialize costs state for missing expenses
        if (data?.missingCostExpenses) {
          const initialCosts: Record<number, string> = {};
          data.missingCostExpenses.forEach((e: MissingCostExpense) => {
            initialCosts[e.id] = '';
          });
          setCosts(initialCosts);
        }
      })
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleCostChange = (expenseId: number, value: string) => {
    setCosts((prev) => ({ ...prev, [expenseId]: value }));
  };

  const handleApply = async () => {
    if (!status) return;

    const expensesToUpdate = status.missingCostExpenses
      .filter((e) => costs[e.id] && costs[e.id].trim() !== '')
      .map((e) => ({
        name: e.name,
        cost: parseFloat(costs[e.id]),
      }))
      .filter((e) => !isNaN(e.cost) && e.cost > 0);

    if (expensesToUpdate.length === 0) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/billing?action=apply`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ expenses: expensesToUpdate }),
      });

      if (res.ok) {
        fetchStatus();
        onUpdate?.();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const hasValidCosts = status?.missingCostExpenses.some(
    (e) => costs[e.id] && costs[e.id].trim() !== '' && !isNaN(parseFloat(costs[e.id])) && parseFloat(costs[e.id]) > 0
  );

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

        {/* Manual cost entry for missing expenses */}
        {status.missingCostExpenses.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="font-medium text-stone-700">Enter costs manually:</div>
            {status.missingCostExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3">
                <div className="flex-1 text-stone-600">
                  {expense.name}
                  <span className="text-stone-400 ml-1">×{expense.itemCount}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={costs[expense.id] || ''}
                    onChange={(e) => handleCostChange(expense.id, e.target.value)}
                    className="w-24 px-3 py-2 pr-7 border border-stone-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">€</span>
                </div>
              </div>
            ))}
            <Button
              onClick={handleApply}
              disabled={!hasValidCosts || isSaving}
              className="w-full mt-2"
            >
              {isSaving ? 'Saving...' : 'Apply'}
            </Button>
          </div>
        )}
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
              <div className="font-bold text-lg text-stone-800 flex items-center gap-2">
                {bill.participantName}
                {bill.personCount > 1 && (
                  <span className="text-stone-400 font-normal text-sm">
                    ({bill.personCount})
                  </span>
                )}
                {bill.hasPaid && (
                  <span className="text-green-500" title="Paid">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
              <div className={`text-xl font-bold ${bill.hasPaid ? 'text-green-600' : 'text-amber-600'}`}>
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
