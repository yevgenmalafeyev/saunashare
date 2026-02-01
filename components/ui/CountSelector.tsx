'use client';

import { useState } from 'react';

interface CountSelectorProps {
  options: readonly number[];
  value: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md';
  extendedMode?: boolean;
}

export function CountSelector({ options, value, onChange, size = 'md', extendedMode = false }: CountSelectorProps) {
  const [isExtended, setIsExtended] = useState(false);

  const sizeClasses = size === 'sm'
    ? 'w-8 h-8 text-sm'
    : 'w-10 h-10';

  const smallBtnClasses = size === 'sm'
    ? 'w-7 h-8 text-sm'
    : 'w-8 h-10';

  // For extended mode, filter out options > 5 (keep up to 4, show 5+ as special button)
  const displayOptions = extendedMode ? options.filter((o) => o < 5) : options;
  const showExtendedUI = extendedMode && (isExtended || value >= 5);

  if (showExtendedUI) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            setIsExtended(false);
            if (value >= 5) onChange(1);
          }}
          className={`${smallBtnClasses} rounded-lg font-medium transition-all bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => onChange(Math.max(5, value - 1))}
          className={`${smallBtnClasses} rounded-lg font-bold transition-all bg-stone-100 text-stone-600 hover:bg-stone-200`}
        >
          −
        </button>
        <span className={`${sizeClasses} flex items-center justify-center font-semibold text-stone-800`}>
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(99, value + 1))}
          className={`${smallBtnClasses} rounded-lg font-bold transition-all bg-stone-100 text-stone-600 hover:bg-stone-200`}
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {displayOptions.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`${sizeClasses} rounded-lg font-medium transition-all ${
            value === option && value < 5
              ? 'bg-amber-600 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          {option}
        </button>
      ))}
      {extendedMode && (
        <button
          onClick={() => {
            setIsExtended(true);
            if (value < 5) onChange(5);
          }}
          className={`${sizeClasses} rounded-lg font-medium transition-all ${
            value >= 5
              ? 'bg-amber-600 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          5+
        </button>
      )}
    </div>
  );
}
