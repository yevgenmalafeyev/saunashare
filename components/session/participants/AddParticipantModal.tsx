'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Button, CreateNewButton, CountSelector } from '@/components/ui';
import { useTranslation } from '@/lib/context/I18nContext';
import { PERSON_COUNT_OPTIONS, JSON_HEADERS } from '@/lib/constants';
import type { ParticipantSuggestion } from '@/lib/types';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  existingParticipantIds: number[];
  onAdd: () => void;
}

export function AddParticipantModal({
  isOpen,
  onClose,
  sessionId,
  existingParticipantIds,
  onAdd,
}: AddParticipantModalProps) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<ParticipantSuggestion[]>([]);
  const [newName, setNewName] = useState('');
  const [personCount, setPersonCount] = useState(1);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/participants')
      .then((res) => res.ok ? res.json() : [])
      .then(setSuggestions);

    setNewName('');
    setPersonCount(1);
    setIsCreatingNew(false);
    setError(null);
  }, [isOpen]);

  const errorFromResponse = async (res: Response) => {
    if (res.status === 403) return t('session.billIssuedCannotAdd');
    const body = await res.json().catch(() => null);
    return body?.error || t('common.error');
  };

  // Filter suggestions to exclude already-added participants
  const availableSuggestions = suggestions.filter(
    (p) => !existingParticipantIds.includes(p.id)
  );

  const handleSelectExisting = async (participant: ParticipantSuggestion) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/participants`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ participantId: participant.id, personCount: participant.recentPersonCount }),
      });

      if (res.ok) {
        // Remove from suggestions list but keep modal open
        setSuggestions((prev) => prev.filter((p) => p.id !== participant.id));
        onAdd();
      } else {
        setError(await errorFromResponse(res));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!newName.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/participants`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: newName.trim(), personCount }),
      });

      if (res.ok) {
        onAdd();
        onClose();
      } else {
        setError(await errorFromResponse(res));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('session.addParticipant')}>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700">
          {error}
        </div>
      )}
      {!isCreatingNew ? (
        <div className="space-y-4">
          {availableSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-stone-500">{t('session.selectFromPrevious')}</p>
              <div className="grid grid-cols-2 gap-2">
                {availableSuggestions.map((participant) => (
                  <button
                    key={participant.id}
                    onClick={() => handleSelectExisting(participant)}
                    disabled={isLoading}
                    className="p-3 text-left bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-300 rounded-xl transition-colors"
                  >
                    <div className="font-medium text-stone-800">
                      {participant.name}
                      {participant.recentPersonCount > 1 && (
                        <span className="text-stone-400 font-normal ml-1">
                          ({participant.recentPersonCount})
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <CreateNewButton
            label={t('session.createNewParticipant')}
            onClick={() => setIsCreatingNew(true)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label={t('common.name')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('session.enterName')}
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {t('session.numberOfPeople')}
            </label>
            <CountSelector
              options={PERSON_COUNT_OPTIONS}
              value={personCount}
              onChange={setPersonCount}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsCreatingNew(false)}
            >
              {t('common.back')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateNew}
              disabled={!newName.trim() || isLoading}
            >
              {isLoading ? t('common.adding') : t('common.add')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
