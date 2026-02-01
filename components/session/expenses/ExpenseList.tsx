'use client';

import { useState, useEffect, useCallback } from 'react';
import { Spinner, CountSelector, SwipeableRow } from '@/components/ui';
import { AddExpenseModal } from './AddExpenseModal';
import { AssignmentEditor } from './AssignmentEditor';
import type { SessionParticipant, Expense } from '@/lib/types';
import { ITEM_COUNT_OPTIONS, JSON_HEADERS, DEFAULT_EXPENSE_NAME } from '@/lib/constants';

interface ExpenseListProps {
  sessionId: number;
  onUpdate: () => void;
}

export function ExpenseList({ sessionId, onUpdate }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [expensesRes, participantsRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}/expenses`),
        fetch(`/api/sessions/${sessionId}/participants`),
      ]);

      if (expensesRes.ok) {
        setExpenses(await expensesRes.json());
      }
      if (participantsRes.ok) {
        setParticipants(await participantsRes.json());
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateCount = async (expenseId: number, newCount: number) => {
    const res = await fetch(`/api/sessions/${sessionId}/expenses/${expenseId}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ itemCount: newCount }),
    });

    if (res.ok) {
      fetchData();
      onUpdate();
    }
  };

  const handleDelete = async (expenseId: number) => {
    const res = await fetch(`/api/sessions/${sessionId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      fetchData();
      onUpdate();
    }
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-medium text-stone-700">
        {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
      </div>

      {expenses.length === 0 ? (
        <div className="space-y-4">
          <div className="text-center py-8 text-stone-500">
            No expenses yet. Add an expense to get started.
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-14 h-14 bg-amber-600 text-white rounded-full shadow-lg hover:bg-amber-700 active:scale-95 transition-transform duration-200 flex items-center justify-center"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {[...expenses].sort((a, b) => {
            // Put default expense at the top
            if (a.name === DEFAULT_EXPENSE_NAME) return -1;
            if (b.name === DEFAULT_EXPENSE_NAME) return 1;
            return 0;
          }).map((expense) => {
            const isDefaultExpense = expense.name === DEFAULT_EXPENSE_NAME;
            const totalAssigned = expense.assignments.reduce((sum, a) => sum + a.share, 0);
            const unassigned = expense.itemCount - totalAssigned;

            return (
              <SwipeableRow
                key={expense.id}
                onAction={() => handleDelete(expense.id)}
                actionLabel="Delete"
                actionColor="red"
              >
                <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                  <div className={`p-4 flex items-center gap-4 ${!isDefaultExpense ? 'border-b border-stone-100' : ''}`}>
                    <div className="flex-1">
                      <div className="font-medium text-stone-800">{expense.name}</div>
                      {expense.totalCost !== null && (
                        <div className="text-sm text-amber-600 font-medium">
                          {expense.totalCost.toFixed(0)} €
                        </div>
                      )}
                    </div>

                    {!isDefaultExpense && (
                      <>
                        <CountSelector
                          options={ITEM_COUNT_OPTIONS}
                          value={expense.itemCount}
                          onChange={(count) => handleUpdateCount(expense.id, count)}
                          size="sm"
                          extendedMode
                        />

                        <button
                          onClick={() => setEditingExpense(expense)}
                          className="relative p-2 -mr-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          {unassigned > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
                              {unassigned}
                            </span>
                          )}
                        </button>
                      </>
                    )}
                  </div>

                {/* Assignments preview - hidden for default expense */}
                {!isDefaultExpense && expense.assignments.length > 0 && (
                  <div className="px-4 py-2 bg-stone-50 flex flex-wrap gap-2">
                    {expense.assignments.map((assignment) => {
                      const participant = participants.find(
                        (p) => p.id === assignment.sessionParticipantId
                      );
                      return participant ? (
                        <span
                          key={assignment.sessionParticipantId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-stone-200 rounded-full text-sm"
                        >
                          <span className="text-stone-700">{participant.name}</span>
                          <span className="text-amber-600 font-medium">×{assignment.share}</span>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </SwipeableRow>
            );
          })}
          <div className="flex justify-end">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-14 h-14 bg-amber-600 text-white rounded-full shadow-lg hover:bg-amber-700 active:scale-95 transition-transform duration-200 flex items-center justify-center"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          onUpdate(); // Trigger global refresh only when modal closes
        }}
        sessionId={sessionId}
        existingExpenseNames={expenses.map((e) => e.name)}
        onAdd={() => {
          fetchData(); // Just refresh expense list, don't trigger global refresh
        }}
      />

      <AssignmentEditor
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        expense={editingExpense}
        participants={participants}
        sessionId={sessionId}
        onUpdate={() => {
          fetchData();
          onUpdate();
        }}
      />
    </div>
  );
}
