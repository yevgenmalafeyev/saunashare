'use client';

import { useState, useEffect, useCallback } from 'react';
import { Spinner, CountSelector, SwipeableRow, FloatingButton, CheckCircleIcon } from '@/components/ui';
import { AddParticipantModal } from './AddParticipantModal';
import { DutyPersonSwitch } from './DutyPersonSwitch';
import { useTranslation } from '@/lib/context/I18nContext';
import type { SessionParticipant } from '@/lib/types';
import { PERSON_COUNT_OPTIONS, JSON_HEADERS } from '@/lib/constants';

interface ParticipantListProps {
  sessionId: number;
  onUpdate: () => void;
  billingReady?: boolean;
}

export function ParticipantList({ sessionId, onUpdate, billingReady = false }: ParticipantListProps) {
  const { t } = useTranslation();
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchParticipants = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/participants`);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const handleUpdateCount = async (participantId: number, newCount: number) => {
    const res = await fetch(`/api/sessions/${sessionId}/participants/${participantId}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ personCount: newCount }),
    });

    if (res.ok) {
      fetchParticipants();
      onUpdate();
    }
  };

  const handleRemove = async (participantId: number) => {
    const res = await fetch(`/api/sessions/${sessionId}/participants/${participantId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      fetchParticipants();
      onUpdate();
      window.dispatchEvent(new CustomEvent('participantChange'));
    }
  };

  const handleTogglePaid = async (participantId: number, currentlyPaid: boolean) => {
    const res = await fetch(`/api/sessions/${sessionId}/participants/${participantId}/payment`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ hasPaid: !currentlyPaid }),
    });

    if (res.ok) {
      fetchParticipants();
      onUpdate();
    }
  };

  const totalPeople = participants.reduce((sum, p) => sum + p.personCount, 0);

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-medium text-stone-700">
        {t('common.total')}: <span className="text-amber-700">{totalPeople} {t('common.people')}</span>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-8 text-stone-500">
          {t('session.noParticipantsDesc')}
        </div>
      ) : (
        <div className="space-y-3">
          {participants.map((participant) => (
            <SwipeableRow
              key={participant.id}
              onAction={() => handleRemove(participant.id)}
              actionLabel={t('common.remove')}
              actionColor="red"
              leftAction={billingReady ? {
                onAction: () => handleTogglePaid(participant.id, participant.hasPaid ?? false),
                label: participant.hasPaid ? t('session.markUnpaid') : t('session.markPaid'),
                color: participant.hasPaid ? 'amber' : 'green',
              } : undefined}
            >
              <div className="border border-stone-200 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium text-stone-800 flex items-center gap-2">
                    {participant.name}
                    {participant.hasPaid && (
                      <span className="text-green-500" title={t('session.markPaid')}>
                        <CheckCircleIcon />
                      </span>
                    )}
                  </div>
                </div>

                <CountSelector
                  options={PERSON_COUNT_OPTIONS}
                  value={participant.personCount}
                  onChange={(count) => handleUpdateCount(participant.id, count)}
                />
              </div>
            </SwipeableRow>
          ))}
        </div>
      )}

      <AddParticipantModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          onUpdate(); // Trigger global refresh only when modal closes
        }}
        sessionId={sessionId}
        existingParticipantIds={participants.map((p) => p.participantId)}
        onAdd={() => {
          fetchParticipants(); // Just refresh participant list, don't trigger global refresh
        }}
      />

      <DutyPersonSwitch sessionId={sessionId} onUpdate={onUpdate} />

      <FloatingButton onClick={() => setIsAddModalOpen(true)} storageKey="fab-participants" />
    </div>
  );
}
