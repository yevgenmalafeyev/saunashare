'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner, Button, CloseIcon, CheckCircleIcon } from '@/components/ui';
import { useTranslation } from '@/lib/context/I18nContext';
import { useAuth } from '@/lib/context/AuthContext';
import { UserExpenseList } from './UserExpenseList';
import { AddUserExpenseModal } from './AddUserExpenseModal';
import { ContactButtons } from './ContactButtons';
import { PaymentButton } from './PaymentButton';
import { JSON_HEADERS, DEFAULT_EXPENSE_NAME } from '@/lib/constants';
import type { Session, ParticipantBill, UserExpenseAssignment } from '@/lib/types';

interface SessionParticipantMeta {
  hasPaid: boolean;
  joinedAt: string | null;
}

interface UserSessionViewProps {
  sessionId: number;
}

export function UserSessionView({ sessionId }: UserSessionViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { currentUserId, setCurrentUserId } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [participantName, setParticipantName] = useState<string>('');
  const [personCount, setPersonCount] = useState<number>(1);
  const [assignments, setAssignments] = useState<UserExpenseAssignment[]>([]);
  const [meta, setMeta] = useState<SessionParticipantMeta | null>(null);
  const [billingStatus, setBillingStatus] = useState<{
    ready: boolean;
    bills: ParticipantBill[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showTotalInvoice, setShowTotalInvoice] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const [sessionRes, participantsRes, expensesRes, billingRes, metaRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`),
        fetch(`/api/sessions/${sessionId}/participants`),
        fetch(`/api/sessions/${sessionId}/expenses`),
        fetch(`/api/sessions/${sessionId}/billing?type=calculate`),
        fetch(`/api/sessions/${sessionId}/participants/${currentUserId}/payment`),
      ]);

      const sessionData = await sessionRes.json();
      const participantsData = await participantsRes.json();
      const expensesData = await expensesRes.json();
      const billingData = await billingRes.json();
      const metaData = await metaRes.json();

      setSession(sessionData);
      setMeta(metaData);
      setBillingStatus(billingData);

      // Find current user's info
      const currentParticipant = participantsData.find(
        (p: { id: number }) => p.id === currentUserId
      );
      if (currentParticipant) {
        setParticipantName(currentParticipant.name);
        setPersonCount(currentParticipant.personCount);
      }

      // Build assignments for current user
      const userAssignments: UserExpenseAssignment[] = [];
      for (const expense of expensesData) {
        const assignment = expense.assignments?.find(
          (a: { sessionParticipantId: number }) => a.sessionParticipantId === currentUserId
        );
        if (assignment && assignment.share > 0) {
          userAssignments.push({
            expenseId: expense.id,
            expenseName: expense.name,
            itemCount: expense.itemCount,
            share: assignment.share,
            totalCost: expense.totalCost,
          });
        }
      }
      setAssignments(userAssignments);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, currentUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleExpenseAdded = () => {
    setRefreshKey((k) => k + 1);
  };

  // Calculate if user can leave
  // Can leave if: no expenses assigned (except default), within 10 minutes of joining
  const canLeave = () => {
    if (!meta?.joinedAt) return false;

    const nonDefaultAssignments = assignments.filter(
      (a) => a.expenseName !== DEFAULT_EXPENSE_NAME
    );
    if (nonDefaultAssignments.length > 0) return false;

    const joinedAt = new Date(meta.joinedAt);
    const now = new Date();
    const minutesSinceJoin = (now.getTime() - joinedAt.getTime()) / (1000 * 60);
    return minutesSinceJoin <= 10;
  };

  const handleLeave = async () => {
    if (!currentUserId) return;

    try {
      await fetch(`/api/sessions/${sessionId}/participants/${currentUserId}`, {
        method: 'DELETE',
        headers: JSON_HEADERS,
      });
      setCurrentUserId(null);
      router.push('/');
    } catch {
      // Ignore errors
    }
  };

  // Get current user's bill if billing is ready
  const myBill = billingStatus?.ready
    ? billingStatus.bills.find((b) => b.sessionParticipantId === currentUserId)
    : null;

  if (isLoading) {
    return <Spinner />;
  }

  if (!currentUserId) {
    return (
      <div className="text-center py-8 text-stone-500">
        {t('user.noActiveSessions')}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-44">
      <div className="space-y-6 flex-1">
        {/* Header with name and cancel button */}
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-stone-800">
              {participantName}
              {personCount > 1 && (
                <span className="text-stone-400 font-normal ml-1">
                  ({personCount})
                </span>
              )}
            </div>
            {canLeave() && (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="px-3 py-1.5 text-sm bg-stone-200 hover:bg-stone-300 text-stone-600 rounded-lg transition-colors"
              >
                {t('user.leave')}
              </button>
            )}
          </div>
        </div>

        {/* Billing ready notification */}
        {billingStatus?.ready && myBill && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-green-800">{t('user.billReady')}</span>
              <span className="text-xl font-bold text-green-700">{myBill.total} €</span>
            </div>
            <div className="space-y-3">
              {/* Bill breakdown - always visible when bill is issued */}
              <div className="bg-white border border-green-100 rounded-lg p-3 space-y-2">
                {myBill.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-stone-600">
                      {item.expenseName} <span className="text-stone-400">×{item.share}</span>
                    </span>
                    <span className="font-medium text-stone-700">{item.cost.toFixed(0)} €</span>
                  </div>
                ))}
                <div className="border-t border-stone-200 pt-2 mt-2 flex justify-between font-bold">
                  <span className="text-stone-800">{t('billing.total')}</span>
                  <span className="text-green-700">{myBill.total} €</span>
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowTotalInvoice(true)}
              >
                {t('billing.viewTotalInvoice')}
              </Button>

              <PaymentButton
                sessionId={sessionId}
                sessionParticipantId={currentUserId}
                initialHasPaid={meta?.hasPaid}
                onPaymentChange={() => setRefreshKey((k) => k + 1)}
              />
            </div>
          </div>
        )}

        {/* User's expenses */}
        <div>
          <UserExpenseList
            sessionId={sessionId}
            sessionParticipantId={currentUserId}
            assignments={assignments}
            onUpdate={() => setRefreshKey((k) => k + 1)}
            canEdit={!billingStatus?.ready}
          />
          {/* Add expense button - only show before billing is ready */}
          {!billingStatus?.ready && (
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowAddExpense(true)}
                className="w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg flex items-center justify-center text-3xl font-light transition-colors"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Bill issued message */}
        {billingStatus?.ready && (
          <div className="bg-stone-100 border border-stone-200 rounded-xl p-4 text-center text-sm text-stone-500">
            {t('user.billIssued')}
          </div>
        )}
      </div>

      {/* Leave confirmation dialog */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-stone-800 mb-2">
              {t('user.leave')}
            </h3>
            <p className="text-stone-600 mb-6">{t('user.leaveConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 px-6 py-4 rounded-xl bg-stone-200 text-stone-800 text-lg font-semibold hover:bg-stone-300 transition-colors"
              >
                {t('common.no')}
              </button>
              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  handleLeave();
                }}
                className="flex-1 px-6 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-lg font-semibold transition-colors"
              >
                {t('common.yes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom section */}
      <div className="fixed bottom-0 left-0 right-0 bg-stone-50 border-t border-stone-200 p-4">
        {/* Contact buttons */}
        {session?.dutyPerson && <ContactButtons dutyPerson={session.dutyPerson} />}
      </div>

      {/* Add expense modal */}
      <AddUserExpenseModal
        sessionId={sessionId}
        sessionParticipantId={currentUserId}
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onExpenseAdded={handleExpenseAdded}
        existingExpenseNames={assignments.map((a) => a.expenseName)}
      />

      {/* Total invoice modal */}
      {showTotalInvoice && billingStatus?.ready && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-hidden"
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl"
            style={{ overscrollBehavior: 'contain' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-800">
                {t('billing.grandTotal')}
              </h3>
              <button
                onClick={() => setShowTotalInvoice(false)}
                className="p-2 text-stone-400 hover:text-stone-600"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {billingStatus.bills.map((bill) => (
                <div
                  key={bill.sessionParticipantId}
                  className={`rounded-xl p-4 ${
                    bill.sessionParticipantId === currentUserId
                      ? 'bg-amber-50 border-2 border-amber-300'
                      : 'bg-stone-50 border border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-stone-800 flex items-center gap-2">
                      {bill.participantName}
                      {bill.personCount > 1 && (
                        <span className="text-stone-400 font-normal text-sm">
                          ({bill.personCount})
                        </span>
                      )}
                      {bill.hasPaid && (
                        <span className="text-green-500" title="Paid">
                          <CheckCircleIcon className="w-5 h-5" />
                        </span>
                      )}
                    </div>
                    <div className={`text-lg font-bold ${bill.hasPaid ? 'text-green-600' : 'text-amber-600'}`}>
                      {bill.total} €
                    </div>
                  </div>
                  <div className="text-sm text-stone-500 space-y-0.5">
                    {bill.breakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.expenseName} ×{item.share}</span>
                        <span>{item.cost.toFixed(0)} €</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {/* Grand total */}
              <div className="bg-amber-100 border border-amber-300 rounded-xl p-4 flex items-center justify-between">
                <span className="font-bold text-amber-800">{t('billing.grandTotal')}</span>
                <span className="text-xl font-bold text-amber-800">
                  {billingStatus.bills.reduce((sum, b) => sum + b.total, 0)} €
                </span>
              </div>
            </div>
            <Button
              className="w-full mt-4"
              onClick={() => setShowTotalInvoice(false)}
            >
              {t('common.close')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
