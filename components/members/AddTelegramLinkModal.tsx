'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { useTranslation } from '@/lib/context/I18nContext';
import { JSON_HEADERS } from '@/lib/constants';
import type { TelegramUserOption } from '@/lib/types';

interface AddTelegramLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantId: number;
  existingTelegramUserIds: number[];
  onLinked: () => void;
}

export function AddTelegramLinkModal({
  isOpen,
  onClose,
  participantId,
  existingTelegramUserIds,
  onLinked,
}: AddTelegramLinkModalProps) {
  const { t } = useTranslation();
  const [telegramUsers, setTelegramUsers] = useState<TelegramUserOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/members/telegram-users')
      .then((res) => (res.ok ? res.json() : []))
      .then(setTelegramUsers);
  }, [isOpen]);

  const available = telegramUsers.filter(
    (tu) => !existingTelegramUserIds.includes(tu.id)
  );

  const handleSelect = async (telegramUserId: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/members/${participantId}/telegram-links`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ telegramUserId }),
      });

      if (res.ok) {
        onLinked();
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('members.selectTelegramUser')}>
      {available.length === 0 ? (
        <p className="text-sm text-stone-500 text-center py-4">
          {t('members.noTelegramUsers')}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {available.map((tu) => (
            <button
              key={tu.id}
              onClick={() => handleSelect(tu.id)}
              disabled={isLoading}
              className="p-3 text-left bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-300 rounded-xl transition-colors"
            >
              <div className="font-medium text-stone-800">
                {tu.telegramFirstName || tu.telegramUsername || `ID ${tu.id}`}
              </div>
              {tu.telegramUsername && (
                <div className="text-xs text-stone-400">@{tu.telegramUsername}</div>
              )}
              {tu.linkedParticipantIds.length > 0 && (
                <div className="text-xs text-amber-600 mt-1">
                  {tu.linkedParticipantIds.length} link{tu.linkedParticipantIds.length > 1 ? 's' : ''}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
