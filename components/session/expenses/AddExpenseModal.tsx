'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Button, CreateNewButton, ArrowLeftIcon } from '@/components/ui';
import { useTranslation } from '@/lib/context/I18nContext';
import { ITEM_COUNT_OPTIONS, JSON_HEADERS } from '@/lib/constants';
import type { ExpenseTemplate } from '@/lib/types';

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
  const { t } = useTranslation();
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
    <Modal isOpen={isOpen} onClose={onClose} title={t('session.addExpense')}>
      {!isCreatingNew ? (
        <div className="space-y-4">
          {availableTemplates.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-stone-500">{t('session.selectFromTemplates')}</p>
              <div className="space-y-2">
                {availableTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center gap-2 p-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <div className="flex-1 pl-2">
                      <div className="font-medium text-stone-800">{template.name}</div>
                      {template.isSystem && (
                        <span className="text-xs text-stone-400">{t('session.systemTemplate')}</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {[0.5, 1, 2, 3, 4].map((count) => (
                        <button
                          key={count}
                          onClick={() => handleSelectTemplate(template.name, count)}
                          disabled={isLoading}
                          className="w-9 h-9 flex items-center justify-center bg-white hover:bg-amber-50 border border-stone-200 hover:border-amber-400 rounded-lg font-medium text-stone-700 hover:text-amber-700 transition-colors text-sm"
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
            label={t('session.createNewExpense')}
            onClick={() => setIsCreatingNew(true)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label={t('session.expenseName')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('session.expensePlaceholder')}
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {t('common.count')}
            </label>
            {!isExtendedCount ? (
              <div className="flex gap-2">
                {ITEM_COUNT_OPTIONS.filter((c) => c < 5).map((count) => (
                  <button
                    key={count}
                    onClick={() => setItemCount(count)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      itemCount === count && itemCount < 5
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
                    if (itemCount < 5) setItemCount(5);
                  }}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    itemCount >= 5
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  5+
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    setIsExtendedCount(false);
                    if (itemCount >= 5) setItemCount(1);
                  }}
                  className="w-12 h-12 flex items-center justify-center bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-xl font-medium transition-all"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <div className="flex-1 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setItemCount(Math.max(5, itemCount - 1))}
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
