'use client';

import { ReactNode } from 'react';
import { useDraggablePosition } from '@/lib/hooks';

interface FloatingButtonProps {
  onClick: () => void;
  children?: ReactNode;
  storageKey?: string;
}

export function FloatingButton({ onClick, children, storageKey = 'fab-position' }: FloatingButtonProps) {
  const { position, isDragging, handlers } = useDraggablePosition({
    storageKey,
    onTap: onClick,
  });

  return (
    <button
      onTouchStart={handlers.onTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
      onClick={handlers.onClick}
      style={{
        position: 'fixed',
        right: position.right,
        bottom: position.bottom,
        touchAction: 'none',
      }}
      className={`w-14 h-14 bg-amber-600 text-white rounded-full shadow-lg hover:bg-amber-700 flex items-center justify-center z-10 ${
        isDragging ? 'scale-110 shadow-xl' : 'active:scale-95 transition-transform duration-200'
      }`}
    >
      {children || (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      )}
    </button>
  );
}
