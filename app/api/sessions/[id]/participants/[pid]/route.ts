import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { sessionParticipants, participants, expenseAssignments } from '@/lib/db/schema';
import { getDefaultExpense } from '@/lib/db/queries';
import { eq, and } from 'drizzle-orm';
import { parseRouteParams, apiSuccess, apiError } from '@/lib/utils/api';
import { validateUpdateParticipant, validateAndRespond } from '@/lib/validation/schemas';

type RouteParams = { params: Promise<{ id: string; pid: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId, pid: sessionParticipantId } = await parseRouteParams(params);
  const body = await request.json();
  const validated = validateAndRespond(validateUpdateParticipant, body);
  if (validated.error) return validated.error;
  const { personCount } = validated.data;

  const [updated] = await db
    .update(sessionParticipants)
    .set({ personCount })
    .where(
      and(
        eq(sessionParticipants.id, sessionParticipantId),
        eq(sessionParticipants.sessionId, sessionId)
      )
    )
    .returning();

  // Update the share for default expense
  const timeExpense = await getDefaultExpense(sessionId);
  if (timeExpense) {
    await db
      .update(expenseAssignments)
      .set({ share: personCount })
      .where(
        and(
          eq(expenseAssignments.expenseId, timeExpense.id),
          eq(expenseAssignments.sessionParticipantId, sessionParticipantId)
        )
      );
  }

  return apiSuccess(updated);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { pid: sessionParticipantId } = await parseRouteParams(params);

  const [sp] = await db
    .select()
    .from(sessionParticipants)
    .where(eq(sessionParticipants.id, sessionParticipantId));

  if (!sp) {
    return apiError('Not found', 404);
  }

  await db
    .delete(sessionParticipants)
    .where(eq(sessionParticipants.id, sessionParticipantId));

  // Check if participant is used in other sessions
  const otherSessions = await db
    .select()
    .from(sessionParticipants)
    .where(eq(sessionParticipants.participantId, sp.participantId));

  // If participant has no other sessions, delete globally
  if (otherSessions.length === 0) {
    await db
      .delete(participants)
      .where(eq(participants.id, sp.participantId));
  }

  return apiSuccess({ success: true });
}
