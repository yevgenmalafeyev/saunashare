'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Input, Button, FloatingButton } from '@/components/ui';
import { formatSessionDate } from '@/lib/utils/billing';
import { JSON_HEADERS } from '@/lib/constants';

export function CreateSessionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleOpen = () => {
    setName(formatSessionDate(new Date()));
    setIsOpen(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: name.trim() }),
      });

      if (res.ok) {
        const session = await res.json();
        router.push(`/session/${session.id}`);
      }
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <FloatingButton onClick={handleOpen} storageKey="fab-sessions" />

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="New Session">
        <div className="space-y-4">
          <Input
            label="Session Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Jan 15"
            autoFocus
          />
          <Button
            className="w-full"
            size="lg"
            onClick={handleCreate}
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Session'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
