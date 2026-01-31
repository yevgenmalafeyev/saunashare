'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Button, CreateNewButton } from '@/components/ui';
import { ITEM_COUNT_OPTIONS, JSON_HEADERS } from '@/lib/constants';

interface ExpenseTemplate {
  id: number;
  name: string;
  usageCount: number;
  isSystem: boolean;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  onAdd: () => void;
  existingExpenseNames: string[];
}

export function AddExpenseModal({
  isOpen,
  onClose,
  sessionId,
  onAdd,
  existingExpenseNames,
}: AddExpenseModalProps) {
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [addedNames, setAddedNames] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [itemCount, setItemCount] = useState(1);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtendedCount, setIsExtendedCount] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setAddedNames([]);
      setNewName('');
      setItemCount(1);
      setIsCreatingNew(false);
      setIsExtendedCount(false);
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    const res = await fetch('/api/expense-templates');
    if (res.ok) {
      setTemplates(await res.json());
    }
  };

  const handleSelectTemplate = async (name: string, count: number = 1) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/expenses`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name, itemCount: count }),
      });

      if (res.ok) {
        // Remove from available list but keep modal open
        setAddedNames((prev) => [...prev, name]);
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
      const res = await fetch(`/api/sessions/${sessionId}/expenses`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: newName.trim(), itemCount }),
      });

      if (res.ok) {
        onAdd();
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const availableTemplates = templates.filter(
    (t) => !existingExpenseNames.includes(t.name) && !addedNames.includes(t.name)
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Expense">
      {!isCreatingNew ? (
        <div className="space-y-4">
          {availableTemplates.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-stone-500">Select from templates:</p>
              <div className="space-y-2">
                {availableTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center gap-2 p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <div className="flex-1 pl-2">
                      <div className="font-medium text-stone-800">{template.name}</div>
                      {template.isSystem && (
                        <span className="text-xs text-stone-400">System template</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((count) => (
                        <button
                          key={count}
                          onClick={() => handleSelectTemplate(template.name, count)}
                          disabled={isLoading}
                          className="w-9 h-9 flex items-center justify-center bg-white hover:bg-amber-50 border border-stone-200 hover:border-amber-400 rounded-lg font-medium text-stone-700 hover:text-amber-700 transition-colors"
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <CreateNewButton
            label="Create New Expense"
            onClick={() => setIsCreatingNew(true)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Expense Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., Beer"
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Count
            </label>
            {!isExtendedCount ? (
              <div className="flex gap-2">
                {ITEM_COUNT_OPTIONS.filter((c) => c < 6).map((count) => (
                  <button
                    key={count}
                    onClick={() => setItemCount(count)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      itemCount === count && itemCount < 6
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {count}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setIsExtendedCount(true);
                    if (itemCount < 6) setItemCount(6);
                  }}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    itemCount >= 6
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  6+
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    setIsExtendedCount(false);
                    if (itemCount >= 6) setItemCount(1);
                  }}
                  className="w-12 h-12 flex items-center justify-center bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-xl font-medium transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex-1 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setItemCount(Math.max(6, itemCount - 1))}
                    className="w-12 h-12 flex items-center justify-center bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-xl font-bold text-xl transition-all"
                  >
                    −
                  </button>
                  <span className="w-12 text-center text-2xl font-semibold text-stone-800">
                    {itemCount}
                  </span>
                  <button
                    onClick={() => setItemCount(Math.min(99, itemCount + 1))}
                    className="w-12 h-12 flex items-center justify-center bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-xl font-bold text-xl transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
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
