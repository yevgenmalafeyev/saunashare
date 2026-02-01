'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Button, CountSelector } from '@/components/ui';
import { useTranslation } from '@/lib/context/I18nContext';
import { JSON_HEADERS, ITEM_COUNT_OPTIONS } from '@/lib/constants';
import type { ExpenseTemplate } from '@/lib/types';

interface AddUserExpenseModalProps {
  sessionId: number;
  sessionParticipantId: number;
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
}

export function AddUserExpenseModal({
  sessionId,
  sessionParticipantId,
  isOpen,
  onClose,
  onExpenseAdded,
}: AddUserExpenseModalProps) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [itemCount, setItemCount] = useState(1);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    fetch('/api/expense-templates')
      .then((res) => res.json())
      .then(setTemplates)
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const handleSelectTemplate = async (template: ExpenseTemplate) => {
    await createExpense(template.name, 1);
  };

  const handleCreateCustom = async () => {
    if (!customName.trim()) return;
    await createExpense(customName.trim(), itemCount);
  };

  const createExpense = async (name: string, share: number) => {
    setIsSubmitting(true);
    try {
      // Single POST call - API handles find-or-create logic
      const response = await fetch(`/api/sessions/${sessionId}/expenses`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          name,
          share,
          sessionParticipantId,
        }),
      });

      if (response.ok) {
        onExpenseAdded();
        handleClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowCustom(false);
    setCustomName('');
    setItemCount(1);
    onClose();
  };

  // Filter out system expense template
  const nonSystemTemplates = templates.filter((t) => !t.isSystem);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('user.addExpense')}>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : showCustom ? (
        <div className="space-y-4">
          <Input
            label={t('session.expenseName')}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={t('session.expenseName')}
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {t('session.itemCount')}
            </label>
            <CountSelector
              value={itemCount}
              onChange={setItemCount}
              options={[...ITEM_COUNT_OPTIONS]}
              extendedMode
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowCustom(false)}
            >
              {t('common.back')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateCustom}
              disabled={!customName.trim() || isSubmitting}
            >
              {isSubmitting ? t('common.loading') : t('common.add')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {nonSystemTemplates.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {nonSystemTemplates
                .sort((a, b) => b.usageCount - a.usageCount)
                .map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    disabled={isSubmitting}
                    className="py-3 px-4 bg-white border border-stone-200 rounded-xl font-medium text-stone-700 hover:border-amber-300 hover:bg-amber-50 transition-colors disabled:opacity-50 text-left"
                  >
                    {template.name}
                  </button>
                ))}
            </div>
          )}
          <button
            onClick={() => setShowCustom(true)}
            className="w-full py-3 px-4 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
          >
            + {t('session.addExpense')}
          </button>
        </div>
      )}
    </Modal>
  );
}
