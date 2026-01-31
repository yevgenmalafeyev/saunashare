'use client';

import { useRef, useState, ReactNode } from 'react';
import { SWIPE_THRESHOLD_PX, SWIPE_ACTION_WIDTH_PX } from '@/lib/constants';

interface SwipeableRowProps {
  children: ReactNode;
  onAction: () => void;
  actionLabel: string;
  actionColor?: 'red' | 'amber';
  confirmTitle?: string;
  confirmMessage?: string;
}

export function SwipeableRow({
  children,
  onAction,
  actionLabel,
  actionColor = 'red',
  confirmTitle,
  confirmMessage,
}: SwipeableRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const offsetRef = useRef(0); // Track offset during drag
  const isDraggingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = isOpen ? -SWIPE_ACTION_WIDTH_PX : 0;
    offsetRef.current = currentXRef.current;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;

    const diff = e.touches[0].clientX - startXRef.current;
    let newOffset = currentXRef.current + diff;

    // Clamp the offset
    newOffset = Math.max(-SWIPE_ACTION_WIDTH_PX, Math.min(0, newOffset));
    offsetRef.current = newOffset;
    setOffsetX(newOffset);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;

    // Use ref value to avoid stale state
    if (offsetRef.current <= -SWIPE_THRESHOLD_PX) {
      setOffsetX(-SWIPE_ACTION_WIDTH_PX);
      setIsOpen(true);
    } else {
      setOffsetX(0);
      setIsOpen(false);
    }
  };

  const handleActionClick = () => {
    if (confirmTitle || confirmMessage) {
      setShowConfirm(true);
    } else {
      onAction();
      setOffsetX(0);
      setIsOpen(false);
    }
  };

  const handleConfirm = () => {
    onAction();
    setShowConfirm(false);
    setOffsetX(0);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setOffsetX(0);
    setIsOpen(false);
  };

  const close = () => {
    setOffsetX(0);
    setIsOpen(false);
  };

  const bgColor = actionColor === 'red' ? 'bg-red-500' : 'bg-amber-500';
  const confirmBtnColor = actionColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700';

  return (
    <>
      <div className="relative overflow-hidden rounded-xl">
        {/* Action button behind */}
        <div
          className={`absolute inset-y-0 right-0 w-20 ${bgColor} flex items-center justify-center`}
          onClick={handleActionClick}
        >
          <span className="text-white font-medium text-sm">{actionLabel}</span>
        </div>

        {/* Main content */}
        <div
          className="relative bg-white transition-transform duration-200 ease-out"
          style={{ transform: `translateX(${offsetX}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={isOpen ? close : undefined}
        >
          {children}
        </div>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            {confirmTitle && (
              <h3 className="text-lg font-semibold text-stone-800 mb-2">{confirmTitle}</h3>
            )}
            {confirmMessage && (
              <p className="text-stone-600 mb-6">{confirmMessage}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-6 py-4 rounded-xl bg-stone-200 text-stone-800 text-lg font-semibold hover:bg-stone-300 transition-colors"
              >
                No
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 px-6 py-4 rounded-xl ${confirmBtnColor} text-white text-lg font-semibold transition-colors`}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
