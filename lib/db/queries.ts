/**
 * Common database queries extracted for reuse across API routes
 */
import { db } from './index';
import { expenses, expenseAssignments, sessionParticipants, participants, sessionParticipantMeta } from './schema';
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
 * Get all participants for a session with their names and payment status
 * Uses LEFT JOIN to avoid N+1 query problem
 */
export async function getSessionParticipantsWithPayment(sessionId: number) {
  const results = await db
    .select({
      id: sessionParticipants.id,
      participantId: sessionParticipants.participantId,
      name: participants.name,
      personCount: sessionParticipants.personCount,
      hasPaid: sessionParticipantMeta.hasPaid,
      joinedAt: sessionParticipantMeta.joinedAt,
    })
    .from(sessionParticipants)
    .innerJoin(participants, eq(sessionParticipants.participantId, participants.id))
    .leftJoin(sessionParticipantMeta, eq(sessionParticipantMeta.sessionParticipantId, sessionParticipants.id))
    .where(eq(sessionParticipants.sessionId, sessionId));

  return results.map((r) => ({
    id: r.id,
    participantId: r.participantId,
    name: r.name,
    personCount: r.personCount,
    hasPaid: r.hasPaid ?? false,
    joinedAt: r.joinedAt ?? null,
  }));
}

/**
 * Get all expenses for a session with basic assignment info (no participant names)
 * Uses batch query to avoid N+1 problem
 */
export async function getExpensesWithBasicAssignments(sessionId: number) {
  const [allExpenses, allAssignments] = await Promise.all([
    db.select().from(expenses).where(eq(expenses.sessionId, sessionId)),
    db
      .select({
        expenseId: expenseAssignments.expenseId,
        sessionParticipantId: expenseAssignments.sessionParticipantId,
        share: expenseAssignments.share,
      })
      .from(expenseAssignments)
      .innerJoin(expenses, eq(expenses.id, expenseAssignments.expenseId))
      .where(eq(expenses.sessionId, sessionId)),
  ]);

  // Group assignments by expense
  const assignmentsByExpense = new Map<number, { sessionParticipantId: number; share: number }[]>();
  for (const assignment of allAssignments) {
    const existing = assignmentsByExpense.get(assignment.expenseId) || [];
    existing.push({
      sessionParticipantId: assignment.sessionParticipantId,
      share: assignment.share,
    });
    assignmentsByExpense.set(assignment.expenseId, existing);
  }

  return allExpenses.map((expense) => ({
    ...expense,
    assignments: assignmentsByExpense.get(expense.id) || [],
  }));
}

/**
 * Get all expenses for a session with their assignments and participant names
 * Uses batch query to avoid N+1 problem
 */
export async function getExpensesWithAssignments(
  sessionId: number
): Promise<ExpenseWithAssignments[]> {
  // Fetch all data in parallel (2 queries instead of N+1)
  const [allParticipants, allExpenses, allAssignments] = await Promise.all([
    getSessionParticipants(sessionId),
    db.select().from(expenses).where(eq(expenses.sessionId, sessionId)),
    db
      .select({
        expenseId: expenseAssignments.expenseId,
        sessionParticipantId: expenseAssignments.sessionParticipantId,
        share: expenseAssignments.share,
      })
      .from(expenseAssignments)
      .innerJoin(expenses, eq(expenses.id, expenseAssignments.expenseId))
      .where(eq(expenses.sessionId, sessionId)),
  ]);

  // Build lookup map for participants
  const participantMap = new Map(allParticipants.map((p) => [p.id, p.name]));

  // Group assignments by expense
  const assignmentsByExpense = new Map<number, typeof allAssignments>();
  for (const assignment of allAssignments) {
    const existing = assignmentsByExpense.get(assignment.expenseId) || [];
    existing.push(assignment);
    assignmentsByExpense.set(assignment.expenseId, existing);
  }

  return allExpenses.map((expense) => ({
    id: expense.id,
    name: expense.name,
    itemCount: expense.itemCount,
    totalCost: expense.totalCost,
    assignments: (assignmentsByExpense.get(expense.id) || []).map((a) => ({
      sessionParticipantId: a.sessionParticipantId,
      participantName: participantMap.get(a.sessionParticipantId) || 'Unknown',
      share: a.share,
    })),
  }));
}
