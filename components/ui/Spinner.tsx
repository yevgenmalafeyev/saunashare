'use client';

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className = '' }: SpinnerProps) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="animate-spin w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full" />
    </div>
  );
}
