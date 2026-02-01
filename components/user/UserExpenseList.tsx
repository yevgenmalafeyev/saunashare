'use client';

import { useTranslation } from '@/lib/context/I18nContext';
import { SwipeableRow, CountSelector } from '@/components/ui';
import { DEFAULT_EXPENSE_NAME, ITEM_COUNT_OPTIONS, JSON_HEADERS } from '@/lib/constants';
import type { UserExpenseAssignment } from '@/lib/types';

interface UserExpenseListProps {
  sessionId: number;
  sessionParticipantId: number;
  assignments: UserExpenseAssignment[];
  onUpdate?: () => void;
  canEdit?: boolean;
}

export function UserExpenseList({ sessionId, sessionParticipantId, assignments, onUpdate, canEdit = true }: UserExpenseListProps) {
  const { t } = useTranslation();

  const handleDelete = async (expenseId: number) => {
    try {
      // User-specific deletion with query param
      await fetch(`/api/sessions/${sessionId}/expenses/${expenseId}?sessionParticipantId=${sessionParticipantId}`, {
        method: 'DELETE',
      });
      onUpdate?.();
    } catch {
      // Ignore errors
    }
  };

  const handleUpdateShare = async (expenseId: number, newShare: number) => {
    try {
      // Use PATCH for user share updates
      await fetch(`/api/sessions/${sessionId}/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          sessionParticipantId,
          newShare,
        }),
      });
      onUpdate?.();
    } catch {
      // Ignore errors
    }
  };

  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500">
        {t('user.noExpenses')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {assignments.map((assignment) => {
        const isDefaultExpense = assignment.expenseName === DEFAULT_EXPENSE_NAME;
        const canDeleteThis = canEdit && !isDefaultExpense;

        const content = (
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-800">
                  {assignment.expenseName}
                </div>
              </div>
              {!isDefaultExpense && canEdit && (
                <CountSelector
                  options={ITEM_COUNT_OPTIONS}
                  value={assignment.share}
                  onChange={(count) => handleUpdateShare(assignment.expenseId, count)}
                  size="sm"
                  extendedMode
                />
              )}
              {(isDefaultExpense || !canEdit) && (
                <div className="text-sm text-stone-500">
                  ×{assignment.share}
                </div>
              )}
            </div>
          </div>
        );

        if (canDeleteThis) {
          return (
            <SwipeableRow
              key={assignment.expenseId}
              onAction={() => handleDelete(assignment.expenseId)}
              actionLabel={t('common.delete')}
            >
              {content}
            </SwipeableRow>
          );
        }

        return <div key={assignment.expenseId}>{content}</div>;
      })}
    </div>
  );
}
