'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Button } from '@/components/ui';
import { JSON_HEADERS } from '@/lib/constants';

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  expense: { id: number; name: string } | null;
  onUpdate: () => void;
}

export function EditExpenseModal({
  isOpen,
  onClose,
  sessionId,
  expense,
  onUpdate,
}: EditExpenseModalProps) {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setName(expense.name);
    }
  }, [expense]);

  const handleSave = async () => {
    if (!expense || !name.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/expenses/${expense.id}`, {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: name.trim() }),
      });

      if (res.ok) {
        onUpdate();
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Expense">
      <div className="space-y-4">
        <Input
          label="Expense Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter expense name"
          autoFocus
        />
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!name.trim() || name.trim() === expense?.name || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
