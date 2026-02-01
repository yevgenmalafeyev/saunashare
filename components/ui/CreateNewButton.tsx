'use client';

import { PlusIcon } from './Icons';

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
      <PlusIcon className="w-5 h-5" />
      {label}
    </button>
  );
}
