'use client';

import { useRef, useState, ReactNode } from 'react';
import { SWIPE_THRESHOLD_PX, SWIPE_ACTION_WIDTH_PX } from '@/lib/constants';

interface SwipeableRowProps {
  children: ReactNode;
  onAction: () => void;
  actionLabel: string;
  actionColor?: 'red' | 'amber' | 'green';
  confirmTitle?: string;
  confirmMessage?: string;
  // Optional left action (swipe right to reveal)
  leftAction?: {
    onAction: () => void;
    label: string;
    color?: 'red' | 'amber' | 'green';
  };
}

type OpenSide = 'none' | 'left' | 'right';

export function SwipeableRow({
  children,
  onAction,
  actionLabel,
  actionColor = 'red',
  confirmTitle,
  confirmMessage,
  leftAction,
}: SwipeableRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [openSide, setOpenSide] = useState<OpenSide>('none');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'left' | 'right'>('right');
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const offsetRef = useRef(0);
  const isDraggingRef = useRef(false);

  const getColorClass = (color: 'red' | 'amber' | 'green' = 'red') => {
    switch (color) {
      case 'red': return 'bg-red-500';
      case 'amber': return 'bg-amber-500';
      case 'green': return 'bg-green-500';
    }
  };

  const getConfirmBtnClass = (color: 'red' | 'amber' | 'green' = 'red') => {
    switch (color) {
      case 'red': return 'bg-red-600 hover:bg-red-700';
      case 'amber': return 'bg-amber-600 hover:bg-amber-700';
      case 'green': return 'bg-green-600 hover:bg-green-700';
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    // Set initial position based on which side is open
    if (openSide === 'right') {
      currentXRef.current = -SWIPE_ACTION_WIDTH_PX;
    } else if (openSide === 'left') {
      currentXRef.current = SWIPE_ACTION_WIDTH_PX;
    } else {
      currentXRef.current = 0;
    }
    offsetRef.current = currentXRef.current;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;

    const diff = e.touches[0].clientX - startXRef.current;
    let newOffset = currentXRef.current + diff;

    // Clamp the offset based on available actions
    const minOffset = -SWIPE_ACTION_WIDTH_PX;
    const maxOffset = leftAction ? SWIPE_ACTION_WIDTH_PX : 0;
    newOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

    offsetRef.current = newOffset;
    setOffsetX(newOffset);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;

    // Determine which side to snap to
    if (offsetRef.current <= -SWIPE_THRESHOLD_PX) {
      // Swipe left - show right action
      setOffsetX(-SWIPE_ACTION_WIDTH_PX);
      setOpenSide('right');
    } else if (leftAction && offsetRef.current >= SWIPE_THRESHOLD_PX) {
      // Swipe right - show left action
      setOffsetX(SWIPE_ACTION_WIDTH_PX);
      setOpenSide('left');
    } else {
      // Return to center
      setOffsetX(0);
      setOpenSide('none');
    }
  };

  const handleRightActionClick = () => {
    if (confirmTitle || confirmMessage) {
      setConfirmAction('right');
      setShowConfirm(true);
    } else {
      onAction();
      close();
    }
  };

  const handleLeftActionClick = () => {
    if (leftAction) {
      leftAction.onAction();
      close();
    }
  };

  const handleConfirm = () => {
    if (confirmAction === 'right') {
      onAction();
    } else if (leftAction) {
      leftAction.onAction();
    }
    setShowConfirm(false);
    close();
  };

  const handleCancel = () => {
    setShowConfirm(false);
    close();
  };

  const close = () => {
    setOffsetX(0);
    setOpenSide('none');
  };

  const rightBgColor = getColorClass(actionColor);
  const leftBgColor = leftAction ? getColorClass(leftAction.color) : '';
  const confirmBtnColor = getConfirmBtnClass(confirmAction === 'right' ? actionColor : leftAction?.color);

  return (
    <>
      <div className="relative overflow-hidden rounded-xl">
        {/* Right action button (revealed by swiping left) */}
        <div
          className={`absolute inset-y-0 right-0 w-20 ${rightBgColor} flex items-center justify-center`}
          onClick={handleRightActionClick}
        >
          <span className="text-white font-medium text-sm">{actionLabel}</span>
        </div>

        {/* Left action button (revealed by swiping right) */}
        {leftAction && (
          <div
            className={`absolute inset-y-0 left-0 w-20 ${leftBgColor} flex items-center justify-center`}
            onClick={handleLeftActionClick}
          >
            <span className="text-white font-medium text-sm text-center px-1">{leftAction.label}</span>
          </div>
        )}

        {/* Main content */}
        <div
          className="relative bg-white transition-transform duration-200 ease-out"
          style={{ transform: `translateX(${offsetX}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={openSide !== 'none' ? close : undefined}
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
