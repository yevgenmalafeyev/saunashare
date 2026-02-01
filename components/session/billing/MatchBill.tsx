'use client';

import { useState } from 'react';
import { Button, CloseIcon } from '@/components/ui';
import { ImageUploader } from './ImageUploader';
import type { ExtractedExpense } from '@/lib/types';
import { JSON_HEADERS } from '@/lib/constants';

interface MatchBillProps {
  sessionId: number;
  onUpdate: () => void;
  onApplied?: () => void;
}

export function MatchBill({ sessionId, onUpdate, onApplied }: MatchBillProps) {
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
      setResult({ success: false, error: 'Failed to process image' });
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
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2 inline-block" />
                  Processing with Claude...
                </>
              ) : (
                'Extract Costs'
              )}
            </Button>
          )}

          {result && (
            <div className="space-y-4">
              {result.success ? (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="font-medium text-green-800 mb-2">Extracted Costs</div>
                    <div className="space-y-2">
                      {result.expenses?.map((expense, idx) => (
                        <div key={idx} className="flex justify-between text-stone-700">
                          <span>{expense.name} ×{expense.count}</span>
                          <span className="font-medium">{expense.cost} €</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-green-200 flex justify-between font-bold text-green-800">
                        <span>Total</span>
                        <span>{result.total} €</span>
                      </div>
                    </div>
                  </div>

                  {applied ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-amber-800">
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Costs applied to expenses!
                    </div>
                  ) : (
                    <Button className="w-full" size="lg" onClick={handleApply}>
                      Apply Costs to Expenses
                    </Button>
                  )}
                </>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="font-medium text-red-800 mb-1">Error</div>
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
