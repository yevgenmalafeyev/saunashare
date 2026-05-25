import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { sessions, expenses, expenseAssignments, sessionParticipants, sessionParticipantMeta } from '@/lib/db/schema';
import { eq, and, ne, inArray } from 'drizzle-orm';
import { parseRouteParams, apiError, apiSuccess } from '@/lib/utils/api';
import { validateUpdateSession, validatePatchSession, validateAndRespond } from '@/lib/validation/schemas';
import { DEFAULT_EXPENSE_NAME } from '@/lib/constants';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session) {
    return apiError('Session not found', 404);
  }

  return apiSuccess(session);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);
  const body = await request.json();
  const validated = validateAndRespond(validateUpdateSession, body);
  if (validated.error) return validated.error;

  const [session] = await db
    .update(sessions)
    .set({ name: validated.data.name, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();

  return apiSuccess(session);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);
  const body = await request.json();
  const validated = validateAndRespond(validatePatchSession, body);
  if (validated.error) return validated.error;

  const updateData: { hidden?: boolean; dutyPerson?: string | null; updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if ('hidden' in validated.data) {
    updateData.hidden = validated.data.hidden;
  }
  if ('dutyPerson' in validated.data) {
    updateData.dutyPerson = validated.data.dutyPerson;
  }

  const [session] = await db
    .update(sessions)
    .set(updateData)
    .where(eq(sessions.id, sessionId))
    .returning();

  return apiSuccess(session);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);

  // Check if session exists
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session) {
    return apiError('Session not found', 404);
  }

  // Check if session is deletable (no additional expenses beyond default)
  const additionalExpenses = await db
    .select()
    .from(expenses)
    .where(and(
      eq(expenses.sessionId, sessionId),
      ne(expenses.name, DEFAULT_EXPENSE_NAME)
    ));

  if (additionalExpenses.length > 0) {
    return apiError('Cannot delete session with additional expenses', 400);
  }

  // Atomically remove the session and every row that used to be cleaned up by
  // ON DELETE CASCADE. Cascades are not reliably enforced on Turso's remote
  // connection, so we delete the dependent rows explicitly (child rows first).
  const sessionParticipantIds = db
    .select({ id: sessionParticipants.id })
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, sessionId));
  const sessionExpenseIds = db
    .select({ id: expenses.id })
    .from(expenses)
    .where(eq(expenses.sessionId, sessionId));

  await db.batch([
    db.delete(expenseAssignments).where(inArray(expenseAssignments.expenseId, sessionExpenseIds)),
    db.delete(expenseAssignments).where(inArray(expenseAssignments.sessionParticipantId, sessionParticipantIds)),
    db.delete(sessionParticipantMeta).where(inArray(sessionParticipantMeta.sessionParticipantId, sessionParticipantIds)),
    db.delete(sessionParticipants).where(eq(sessionParticipants.sessionId, sessionId)),
    db.delete(expenses).where(eq(expenses.sessionId, sessionId)),
    db.delete(sessions).where(eq(sessions.id, sessionId)),
  ]);

  return apiSuccess({ success: true });
}
