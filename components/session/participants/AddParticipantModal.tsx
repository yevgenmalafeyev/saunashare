'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Button, CreateNewButton, CountSelector } from '@/components/ui';
import { PERSON_COUNT_OPTIONS, JSON_HEADERS } from '@/lib/constants';

interface Participant {
  id: number;
  name: string;
  activityScore: number;
  recentPersonCount: number;
}

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
  const [suggestions, setSuggestions] = useState<Participant[]>([]);
  const [newName, setNewName] = useState('');
  const [personCount, setPersonCount] = useState(1);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/participants')
      .then((res) => res.ok ? res.json() : [])
      .then(setSuggestions);

    setNewName('');
    setPersonCount(1);
    setIsCreatingNew(false);
  }, [isOpen]);

  // Filter suggestions to exclude already-added participants
  const availableSuggestions = suggestions.filter(
    (p) => !existingParticipantIds.includes(p.id)
  );

  const handleSelectExisting = async (participant: Participant) => {
    setIsLoading(true);
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
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Participant">
      {!isCreatingNew ? (
        <div className="space-y-4">
          {availableSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-stone-500">Select from previous participants:</p>
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
            label="Create New Participant"
            onClick={() => setIsCreatingNew(true)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter name"
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Number of People
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
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateNew}
              disabled={!newName.trim() || isLoading}
            >
              {isLoading ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
