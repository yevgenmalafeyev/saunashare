'use client';

import { useState } from 'react';
import { Button, CloseIcon, CheckIcon, LoadingSpinnerIcon } from '@/components/ui';
import { ImageUploader } from './ImageUploader';
import { useTranslation } from '@/lib/context/I18nContext';
import type { ExtractedExpense } from '@/lib/types';
import { JSON_HEADERS } from '@/lib/constants';

interface MatchBillProps {
  sessionId: number;
  onUpdate: () => void;
  onApplied?: () => void;
}

export function MatchBill({ sessionId, onUpdate, onApplied }: MatchBillProps) {
  const { t } = useTranslation();
  const [imageData, setImageData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    expenses?: ExtractedExpense[];
    total?: number;
    error?: string;
  } | null>(null);
  const [applied, setApplied] = useState(false);

  const handleImageSelect = (base64: string) => {
    setImageData(base64);
    setResult(null);
    setApplied(false);
  };

  const handleProcess = async () => {
    if (!imageData) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/billing?action=match`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ image: imageData }),
      });

      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: t('billing.failedToProcess') });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = async () => {
    if (!result?.expenses) return;

    try {
      const res = await fetch(`/api/sessions/${sessionId}/billing?action=apply`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ expenses: result.expenses }),
      });

      if (res.ok) {
        setApplied(true);
        onUpdate();
        onApplied?.();
      }
    } catch (err) {
      console.error('Failed to apply:', err);
    }
  };

  const handleReset = () => {
    setImageData(null);
    setResult(null);
    setApplied(false);
  };

  return (
    <div className="space-y-4">
      {!imageData ? (
        <ImageUploader onImageSelect={handleImageSelect} />
      ) : (
        <>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${imageData}`}
              alt="Bill"
              className="w-full rounded-xl border border-stone-200"
            />
            <button
              onClick={handleReset}
              className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {!result && (
            <Button
              className="w-full"
              size="lg"
              onClick={handleProcess}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <LoadingSpinnerIcon className="w-5 h-5 mr-2 inline-block" />
                  {t('billing.processingWithClaude')}
                </>
              ) : (
                t('billing.extractCosts')
              )}
            </Button>
          )}

          {result && (
            <div className="space-y-4">
              {result.success ? (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="font-medium text-green-800 mb-2">{t('billing.extractedCosts')}</div>
                    <div className="space-y-2">
                      {result.expenses?.map((expense, idx) => (
                        <div key={idx} className="flex justify-between text-stone-700">
                          <span>{expense.name} ×{expense.count}</span>
                          <span className="font-medium">{expense.cost} €</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-green-200 flex justify-between font-bold text-green-800">
                        <span>{t('billing.total')}</span>
                        <span>{result.total} €</span>
                      </div>
                    </div>
                  </div>

                  {applied ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-amber-800">
                      <CheckIcon className="w-8 h-8 mx-auto mb-2" />
                      {t('billing.costsApplied')}
                    </div>
                  ) : (
                    <Button className="w-full" size="lg" onClick={handleApply}>
                      {t('billing.applyCostsToExpenses')}
                    </Button>
                  )}
                </>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="font-medium text-red-800 mb-1">{t('common.error')}</div>
                  <p className="text-red-700">{result.error}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
