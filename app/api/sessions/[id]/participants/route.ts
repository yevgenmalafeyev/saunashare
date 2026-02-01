import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { sessionParticipants, participants, expenseAssignments, sessionParticipantMeta } from '@/lib/db/schema';
import { getDefaultExpense, getSessionParticipantsWithPayment, getExpensesWithAssignments } from '@/lib/db/queries';
import { eq, and } from 'drizzle-orm';
import { parseRouteParams, apiError, apiSuccess } from '@/lib/utils/api';
import { validateCreateParticipant, validateAndRespond } from '@/lib/validation/schemas';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);
  const results = await getSessionParticipantsWithPayment(sessionId);
  return apiSuccess(results);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);
  const body = await request.json();
  const validated = validateAndRespond(validateCreateParticipant, body);
  if (validated.error) return validated.error;

  // Check if billing is already ready (bill issued) - prevent late check-ins
  const expensesWithAssignments = await getExpensesWithAssignments(sessionId);
  const allParticipants = await getSessionParticipantsWithPayment(sessionId);
  const hasExpensesWithoutCost = expensesWithAssignments.some((e) => e.totalCost === null);
  const hasExpensesWithoutAssignments = expensesWithAssignments.some((e) => e.assignments.length === 0);
  const billingReady = allParticipants.length > 0 && !hasExpensesWithoutCost && !hasExpensesWithoutAssignments;

  if (billingReady) {
    return apiError('Cannot check in after bill has been issued', 403);
  }

  const { participantId: inputParticipantId, name, personCount } = validated.data;
  let participantId = inputParticipantId;

  // Create new participant if name is provided
  if (!participantId && name) {
    const [existing] = await db
      .select()
      .from(participants)
      .where(eq(participants.name, name));

    if (existing) {
      participantId = existing.id;
      await db
        .update(participants)
        .set({ activityScore: existing.activityScore + 1 })
        .where(eq(participants.id, existing.id));
    } else {
      const [newParticipant] = await db
        .insert(participants)
        .values({ name, activityScore: 1 })
        .returning();
      participantId = newParticipant.id;
    }
  } else if (participantId) {
    const [existing] = await db
      .select()
      .from(participants)
      .where(eq(participants.id, participantId));

    if (existing) {
      await db
        .update(participants)
        .set({ activityScore: existing.activityScore + 1 })
        .where(eq(participants.id, participantId));
    }
  }

  // Check if already in session
  const [existingLink] = await db
    .select()
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, sessionId),
        eq(sessionParticipants.participantId, participantId!)
      )
    );

  if (existingLink) {
    return apiError('Participant already in session', 400);
  }

  const [sessionParticipant] = await db
    .insert(sessionParticipants)
    .values({
      sessionId,
      participantId: participantId!,
      personCount,
    })
    .returning();

  // Auto-assign to default expense
  const timeExpense = await getDefaultExpense(sessionId);
  if (timeExpense) {
    await db.insert(expenseAssignments).values({
      expenseId: timeExpense.id,
      sessionParticipantId: sessionParticipant.id,
      share: personCount,
    });
  }

  // Create session participant meta record
  await db.insert(sessionParticipantMeta).values({
    sessionParticipantId: sessionParticipant.id,
    hasPaid: false,
    joinedAt: new Date(),
  });

  return apiSuccess(sessionParticipant, 201);
}
