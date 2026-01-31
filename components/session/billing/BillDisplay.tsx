'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ParticipantBill } from '@/lib/types';

interface BillDisplayProps {
  bills: ParticipantBill[];
  grandTotal: number;
  sessionName: string;
  sessionId: number;
  balance?: number;
  expenseTotal?: number;
}

export function BillDisplay({ bills, sessionName, sessionId, balance = 0, expenseTotal }: BillDisplayProps) {
  const [isLandscape, setIsLandscape] = useState<boolean | null>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Hide body background/overflow for this fullscreen display
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalBackground = document.body.style.background;
    document.body.style.overflow = 'hidden';
    document.body.style.background = '#7f1d1d'; // red-900 (matches gradient end)
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.background = originalBackground;
    };
  }, []);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Auto-scale content to fit screen
  useEffect(() => {
    if (!isLandscape || !containerRef.current || !contentRef.current) return;

    const adjustScale = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

      // Reset scale to measure natural size
      setScale(1);

      requestAnimationFrame(() => {
        const containerHeight = container.clientHeight;
        const containerWidth = container.clientWidth;
        const contentHeight = content.scrollHeight;
        const contentWidth = content.scrollWidth;

        // Calculate scale to fit
        const scaleY = containerHeight / contentHeight;
        const scaleX = containerWidth / contentWidth;
        const newScale = Math.min(scaleX, scaleY, 1.5); // Max 1.5x scale up

        setScale(Math.max(0.5, newScale)); // Min 0.5x scale down
      });
    };

    adjustScale();
    window.addEventListener('resize', adjustScale);
    return () => window.removeEventListener('resize', adjustScale);
  }, [isLandscape, bills]);

  // Show nothing until we know orientation
  if (isLandscape === null) {
    return <div className="h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900" />;
  }

  // Show rotated prompt if in portrait
  if (!isLandscape) {
    return (
      <div className="h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center overflow-hidden relative">
        <div
          className="text-white text-center"
          style={{ transform: 'rotate(90deg)' }}
        >
          <div className="text-6xl mb-4">📱</div>
          <div className="text-3xl font-bold">Rotate to landscape</div>
        </div>

        {/* Exit button - bottom right in portrait view */}
        <button
          onClick={() => router.push(`/session/${sessionId}?tab=billing&mode=issue`)}
          className="absolute bottom-6 right-6 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  // Use expenseTotal if provided, otherwise calculate from bills
  const displayTotal = expenseTotal ?? bills.reduce((sum, b) => sum + b.total, 0);

  // Calculate total cards
  const totalCards = bills.length + (balance !== 0 ? 1 : 0) + (bills.length > 7 ? 1 : 0); // +1 for summary card when >7

  // Display modes based on participant count
  const compactMode = bills.length > 7;  // Hide header, show summary card
  const minimalMode = bills.length > 10; // Also hide expense details

  // Determine grid columns based on participant count
  const getGridCols = () => {
    if (totalCards <= 4) return 'grid-cols-2';
    if (totalCards <= 6) return 'grid-cols-3';
    if (totalCards <= 9) return 'grid-cols-3';
    if (totalCards <= 12) return 'grid-cols-4';
    if (totalCards <= 16) return 'grid-cols-4';
    return 'grid-cols-5';
  };

  const sortedBills = [...bills].sort((a, b) => b.breakdown.length - a.breakdown.length);

  const isDefaultExpenseItem = (name: string): boolean => {
    const lower = name.toLowerCase();
    return lower.includes('время') || lower.includes('чай') || lower.includes('вода');
  };

  const sortBreakdown = (breakdown: typeof bills[0]['breakdown']) => {
    return [...breakdown].sort((a, b) => {
      const isTimeA = isDefaultExpenseItem(a.expenseName);
      const isTimeB = isDefaultExpenseItem(b.expenseName);
      return isTimeA === isTimeB ? 0 : isTimeA ? 1 : -1;
    });
  };

  return (
    <div
      ref={containerRef}
      className="bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 text-white flex items-center justify-center overflow-hidden"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        padding: '8px',
        boxSizing: 'border-box',
        overscrollBehavior: 'none',
      }}
    >
      <div
        ref={contentRef}
        className={`grid ${getGridCols()} gap-2 auto-rows-min`}
        style={{
          fontSize: `${scale}rem`,
        }}
      >
        {/* Header card - only show in compact mode */}
        {!compactMode && (
          <div className="col-span-full flex items-center justify-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-amber-200">
              {sessionName}
            </h1>
            <div className="text-2xl font-black text-white">
              {displayTotal} €
            </div>
          </div>
        )}
        {sortedBills.map((bill) => (
          <div
            key={bill.participantId}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/20"
          >
            <div className="text-center mb-1">
              <div className="font-bold text-white leading-tight" style={{ fontSize: `${1.1 * scale}rem` }}>
                {bill.participantName}
              </div>
            </div>

            <div className="font-black text-amber-300 text-center mb-1" style={{ fontSize: `${1.5 * scale}rem` }}>
              {bill.total} €
            </div>

            {/* Expense details - hide in minimal mode */}
            {!minimalMode && (
              <div className="space-y-0.5 text-white/70">
                {sortBreakdown(bill.breakdown).map((item, idx) => (
                  <div key={idx} className="flex justify-between leading-tight">
                    <span className="truncate mr-1">{item.expenseName} <span className="text-white/50">x{item.share}</span></span>
                    <span className="flex-shrink-0">{item.cost.toFixed(0)} €</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Общак (communal balance) card */}
        {balance !== 0 && (
          <div
            className={`rounded-xl p-2 border ${
              balance > 0
                ? 'bg-green-500/30 border-green-400/50'
                : 'bg-red-500/30 border-red-400/50'
            }`}
          >
            <div className="text-center mb-1">
              <div className={`font-bold ${balance > 0 ? 'text-green-200' : 'text-red-200'}`} style={{ fontSize: `${1.1 * scale}rem` }}>
                Общак
              </div>
            </div>
            <div className={`font-black text-center mb-1 ${balance > 0 ? 'text-green-300' : 'text-red-300'}`} style={{ fontSize: `${1.5 * scale}rem` }}>
              {balance > 0 ? '+' : ''}{balance} €
            </div>
          </div>
        )}

        {/* Summary card - only show in compact mode */}
        {compactMode && (
          <div className="bg-amber-500/30 backdrop-blur-sm rounded-xl p-2 border border-amber-400/50">
            <div className="text-center mb-1">
              <div className="font-black text-amber-200 leading-tight" style={{ fontSize: `${1.1 * scale}rem` }}>
                {sessionName}
              </div>
            </div>
            <div className="font-black text-white text-center" style={{ fontSize: `${1.5 * scale}rem` }}>
              {displayTotal} €
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
