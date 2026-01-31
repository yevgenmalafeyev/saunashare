'use client';

interface CreateNewButtonProps {
  label: string;
  onClick: () => void;
}

export function CreateNewButton({ label, onClick }: CreateNewButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 border-2 border-dashed border-amber-300 rounded-xl text-amber-700 font-medium transition-colors"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      {label}
    </button>
  );
}
