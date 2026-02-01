'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, CheckIcon } from '@/components/ui';
import { useTranslation } from '@/lib/context/I18nContext';
import { useDraggablePosition } from '@/lib/hooks';
import type { SessionParticipant, Expense } from '@/lib/types';
import { SHARE_OPTIONS, JSON_HEADERS } from '@/lib/constants';

interface AssignmentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  participants: SessionParticipant[];
  sessionId: number;
  onUpdate: () => void;
}

export function AssignmentEditor({
  isOpen,
  onClose,
  expense,
  participants,
  sessionId,
  onUpdate,
}: AssignmentEditorProps) {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState<Map<number, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!expense || isLoading) return;

    setIsLoading(true);
    try {
      const assignmentArray = Array.from(assignments.entries()).map(
        ([sessionParticipantId, share]) => ({ sessionParticipantId, share })
      );

      const res = await fetch(`/api/sessions/${sessionId}/expenses/${expense.id}`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ assignments: assignmentArray }),
      });

      if (res.ok) {
        onUpdate();
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const { position, isDragging, handlers } = useDraggablePosition({
    storageKey: 'fab-assignment-save',
    onTap: handleSave,
  });

  useEffect(() => {
    if (expense) {
      const map = new Map<number, number>();
      for (const a of expense.assignments) {
        map.set(a.sessionParticipantId, a.share);
      }
      setAssignments(map);
    }
  }, [expense]);

  const handleShareChange = (participantId: number, share: number) => {
    const newAssignments = new Map(assignments);
    if (share === 0) {
      newAssignments.delete(participantId);
    } else {
      newAssignments.set(participantId, share);
    }
    setAssignments(newAssignments);
  };

  const handleAssignAll = () => {
    const newAssignments = new Map<number, number>();
    for (const p of participants) {
      newAssignments.set(p.id, p.personCount);
    }
    setAssignments(newAssignments);
  };

  const totalShares = Array.from(assignments.values()).reduce((sum, s) => sum + s, 0);

  if (!expense) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('session.assign', { name: expense.name })}>
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500">{t('session.totalShares')} <span className="font-medium text-amber-600">{totalShares}</span></span>
          <Button size="sm" variant="ghost" onClick={handleAssignAll}>
            {t('session.assignToAll')}
          </Button>
        </div>

        <div className="space-y-3 pb-16">
          {participants.map((participant) => {
            const currentShare = assignments.get(participant.id) ?? 0;

            return (
              <div
                key={participant.id}
                className="p-3 bg-stone-50 rounded-xl"
              >
                <div className="font-medium text-stone-800 mb-2">
                  {participant.name}
                  {participant.personCount > 1 && (
                    <span className="text-stone-400 font-normal ml-1">
                      ({participant.personCount} {t('common.people')})
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {SHARE_OPTIONS.map((share) => (
                    <button
                      key={share}
                      onClick={() => handleShareChange(participant.id, share)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        currentShare === share
                          ? share === 0
                            ? 'bg-stone-400 text-white'
                            : 'bg-amber-600 text-white'
                          : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-300'
                      }`}
                    >
                      {share === 0 ? '—' : share}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Save Button */}
      <button
        onTouchStart={handlers.onTouchStart}
        onTouchMove={handlers.onTouchMove}
        onTouchEnd={handlers.onTouchEnd}
        onClick={handlers.onClick}
        disabled={isLoading}
        style={{
          position: 'fixed',
          right: position.right,
          bottom: position.bottom,
          touchAction: 'none',
        }}
        className={`w-14 h-14 bg-amber-600 text-white rounded-full shadow-lg hover:bg-amber-700 flex items-center justify-center z-50 disabled:opacity-50 ${
          isDragging ? 'scale-110 shadow-xl' : 'active:scale-95 transition-transform duration-200'
        }`}
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <CheckIcon className="w-7 h-7" />
        )}
      </button>
    </Modal>
  );
}
