/**
 * Common database queries extracted for reuse across API routes
 */
import { db } from './index';
import { expenses, expenseAssignments, sessionParticipants, participants } from './schema';
import { eq, and } from 'drizzle-orm';
import { DEFAULT_EXPENSE_NAME } from '@/lib/constants';
import type { ExpenseWithAssignments } from '@/lib/utils/billing';

/**
 * Get the default expense for a session
 */
export async function getDefaultExpense(sessionId: number) {
  const [expense] = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.sessionId, sessionId),
        eq(expenses.name, DEFAULT_EXPENSE_NAME)
      )
    );
  return expense;
}

/**
 * Get all participants for a session with their names
 */
export async function getSessionParticipants(sessionId: number) {
  return db
    .select({
      id: sessionParticipants.id,
      participantId: sessionParticipants.participantId,
      name: participants.name,
      personCount: sessionParticipants.personCount,
    })
    .from(sessionParticipants)
    .innerJoin(participants, eq(sessionParticipants.participantId, participants.id))
    .where(eq(sessionParticipants.sessionId, sessionId));
}

/**
 * Get all expenses for a session with their assignments and participant names
 */
export async function getExpensesWithAssignments(
  sessionId: number
): Promise<ExpenseWithAssignments[]> {
  const allParticipants = await getSessionParticipants(sessionId);
  const allExpenses = await db
    .select()
    .from(expenses)
    .where(eq(expenses.sessionId, sessionId));

  return Promise.all(
    allExpenses.map(async (expense) => {
      const assignments = await db
        .select({
          sessionParticipantId: expenseAssignments.sessionParticipantId,
          share: expenseAssignments.share,
        })
        .from(expenseAssignments)
        .where(eq(expenseAssignments.expenseId, expense.id));

      const assignmentsWithNames = assignments.map((a) => {
        const participant = allParticipants.find((p) => p.id === a.sessionParticipantId);
        return {
          sessionParticipantId: a.sessionParticipantId,
          participantName: participant?.name || 'Unknown',
          share: a.share,
        };
      });

      return {
        id: expense.id,
        name: expense.name,
        itemCount: expense.itemCount,
        totalCost: expense.totalCost,
        assignments: assignmentsWithNames,
      };
    })
  );
}
