'use client';

import Link from 'next/link';
import { UsersGroupIcon, ChevronRightIcon } from '@/components/ui';

interface SessionCardProps {
  id: number;
  name: string;
  createdAt: Date;
  participantCount?: number;
}

export function SessionCard({ id, name, createdAt, participantCount }: SessionCardProps) {
  const formattedDate = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(createdAt);

  return (
    <Link href={`/session/${id}`} className="block w-full">
      <div className="w-full bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 hover:border-amber-400 hover:shadow-lg transition-all duration-200 active:scale-[0.98]">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-stone-800 mb-1">{name}</h3>
            <p className="text-stone-500">{formattedDate}</p>
          </div>
          {participantCount !== undefined && (
            <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
              <UsersGroupIcon />
              <span className="font-medium">{participantCount}</span>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <ChevronRightIcon className="w-6 h-6 text-amber-600" />
        </div>
      </div>
    </Link>
  );
}
