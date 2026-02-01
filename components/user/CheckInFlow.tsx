'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Button, CountSelector, Spinner } from '@/components/ui';
import { useTranslation } from '@/lib/context/I18nContext';
import { useAuth } from '@/lib/context/AuthContext';
import { JSON_HEADERS, PERSON_COUNT_OPTIONS } from '@/lib/constants';
import type { SessionParticipant, ParticipantSuggestion } from '@/lib/types';

interface CheckInFlowProps {
  sessionId: number;
  isOpen: boolean;
  onClose: () => void;
  onCheckIn: (sessionParticipantId: number, name: string, personCount: number) => void;
}

export function CheckInFlow({ sessionId, isOpen, onClose, onCheckIn }: CheckInFlowProps) {
  const { t } = useTranslation();
  const { setCurrentUserId } = useAuth();
  const [allParticipants, setAllParticipants] = useState<ParticipantSuggestion[]>([]);
  const [sessionParticipants, setSessionParticipants] = useState<SessionParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New participant form state
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [personCount, setPersonCount] = useState(1);

  // Existing participant confirm state
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantSuggestion | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    Promise.all([
      fetch('/api/participants').then((res) => res.json()),
      fetch(`/api/sessions/${sessionId}/participants`).then((res) => res.json()),
    ])
      .then(([participants, sessionParts]) => {
        setAllParticipants(participants);
        setSessionParticipants(sessionParts);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, sessionId]);

  // Filter out participants already in session
  const availableParticipants = allParticipants.filter(
    (p) => !sessionParticipants.some((sp) => sp.participantId === p.id)
  );

  const handleSelectParticipant = (participant: ParticipantSuggestion) => {
    setSelectedParticipant(participant);
    setPersonCount(participant.recentPersonCount);
  };

  const handleConfirmExisting = async () => {
    if (!selectedParticipant) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/participants`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          participantId: selectedParticipant.id,
          personCount,
        }),
      });

      if (res.ok) {
        const sessionParticipant = await res.json();
        setCurrentUserId(sessionParticipant.id);
        onCheckIn(sessionParticipant.id, selectedParticipant.name, personCount);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNew = async () => {
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/participants`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          name: newName.trim(),
          personCount,
        }),
      });

      if (res.ok) {
        const sessionParticipant = await res.json();
        setCurrentUserId(sessionParticipant.id);
        onCheckIn(sessionParticipant.id, newName.trim(), personCount);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowNewForm(false);
    setSelectedParticipant(null);
    setNewName('');
    setPersonCount(1);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('user.checkingIn')}>
      {isLoading ? (
        <Spinner />
      ) : selectedParticipant ? (
        <div className="space-y-4">
          <div className="text-center text-lg font-medium text-stone-800">
            {selectedParticipant.name}
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2 text-center">
              {t('session.howManyPeople')}
            </label>
            <CountSelector
              value={personCount}
              onChange={setPersonCount}
              options={PERSON_COUNT_OPTIONS}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setSelectedParticipant(null)}
            >
              {t('common.back')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirmExisting}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common.loading') : t('common.confirm')}
            </Button>
          </div>
        </div>
      ) : showNewForm ? (
        <div className="space-y-4">
          <Input
            label={t('session.enterName')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('session.enterName')}
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {t('session.howManyPeople')}
            </label>
            <CountSelector
              value={personCount}
              onChange={setPersonCount}
              options={PERSON_COUNT_OPTIONS}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowNewForm(false)}
            >
              {t('common.back')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateNew}
              disabled={!newName.trim() || isSubmitting}
            >
              {isSubmitting ? t('common.loading') : t('common.confirm')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {availableParticipants.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {availableParticipants
                .sort((a, b) => b.activityScore - a.activityScore)
                .map((participant) => (
                  <button
                    key={participant.id}
                    onClick={() => handleSelectParticipant(participant)}
                    disabled={isSubmitting}
                    className="py-3 px-4 bg-white border border-stone-200 rounded-xl font-medium text-stone-700 hover:border-amber-300 hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    {participant.name}
                    <span className="text-stone-400 font-normal ml-1">
                      ({participant.recentPersonCount})
                    </span>
                  </button>
                ))}
            </div>
          )}
          <button
            onClick={() => setShowNewForm(true)}
            className="w-full py-3 px-4 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
          >
            + {t('session.newParticipant')}
          </button>
        </div>
      )}
    </Modal>
  );
}
