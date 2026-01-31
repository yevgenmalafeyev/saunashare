'use client';

import { useState, useEffect, useCallback } from 'react';
import { Spinner, CountSelector, SwipeableRow, FloatingButton } from '@/components/ui';
import { AddParticipantModal } from './AddParticipantModal';
import type { SessionParticipant } from '@/lib/types';
import { PERSON_COUNT_OPTIONS, JSON_HEADERS } from '@/lib/constants';

interface ParticipantListProps {
  sessionId: number;
  onUpdate: () => void;
}

export function ParticipantList({ sessionId, onUpdate }: ParticipantListProps) {
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

  const totalPeople = participants.reduce((sum, p) => sum + p.personCount, 0);

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-medium text-stone-700">
        Total: <span className="text-amber-700">{totalPeople} people</span>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-8 text-stone-500">
          No participants yet. Add someone to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {participants.map((participant) => (
            <SwipeableRow
              key={participant.id}
              onAction={() => handleRemove(participant.id)}
              actionLabel="Remove"
              actionColor="red"
            >
              <div className="border border-stone-200 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-medium text-stone-800">{participant.name}</div>
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

      <FloatingButton onClick={() => setIsAddModalOpen(true)} storageKey="fab-participants" />
    </div>
  );
}
