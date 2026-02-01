import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { expenses, expenseAssignments, expenseTemplates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseRouteParams, apiSuccess, apiError } from '@/lib/utils/api';
import { validateUpdateExpense, validateUpdateAssignments, validateUpdateUserShare, validateAndRespond } from '@/lib/validation/schemas';
import { calculateShareChange, calculateDeletion } from '@/lib/utils/expense-sharing';

type RouteParams = { params: Promise<{ id: string; eid: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId, eid: expenseId } = await parseRouteParams(params);
  const body = await request.json();

  // Validate expense fields if provided
  if ('itemCount' in body || 'totalCost' in body) {
    const validated = validateAndRespond(validateUpdateExpense, body);
    if (validated.error) return validated.error;

    if (Object.keys(validated.data).length > 0) {
      await db
        .update(expenses)
        .set(validated.data)
        .where(
          and(
            eq(expenses.id, expenseId),
            eq(expenses.sessionId, sessionId)
          )
        );
    }
  }

  // Update assignments if provided
  if (body.assignments) {
    const validated = validateAndRespond(validateUpdateAssignments, body);
    if (validated.error) return validated.error;

    // Delete existing assignments
    await db
      .delete(expenseAssignments)
      .where(eq(expenseAssignments.expenseId, expenseId));

    // Insert new assignments
    for (const assignment of validated.data.assignments) {
      if (assignment.share > 0) {
        await db.insert(expenseAssignments).values({
          expenseId,
          sessionParticipantId: assignment.sessionParticipantId,
          share: assignment.share,
        });
      }
    }
  }

  // Return updated expense with assignments
  const [expense] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, expenseId));

  const assignments = await db
    .select()
    .from(expenseAssignments)
    .where(eq(expenseAssignments.expenseId, expenseId));

  return apiSuccess({ ...expense, assignments });
}

/**
 * PATCH handler for user share updates
 * Uses dynamic itemCount adjustment based on share changes
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId, eid: expenseId } = await parseRouteParams(params);
  const body = await request.json();

  const validated = validateAndRespond(validateUpdateUserShare, body);
  if (validated.error) return validated.error;

  const { sessionParticipantId, newShare } = validated.data;

  // Get current expense
  const [expense] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.sessionId, sessionId)));

  if (!expense) {
    return apiError('Expense not found', 404);
  }

  // Get current assignment for this user
  const [currentAssignment] = await db
    .select()
    .from(expenseAssignments)
    .where(
      and(
        eq(expenseAssignments.expenseId, expenseId),
        eq(expenseAssignments.sessionParticipantId, sessionParticipantId)
      )
    );

  if (!currentAssignment) {
    return apiError('User does not have this expense assigned', 404);
  }

  const oldShare = currentAssignment.share;

  // If share is 0, this is effectively a delete
  if (newShare === 0) {
    return handleUserDeletion(sessionId, expenseId, sessionParticipantId, expense);
  }

  // Get other assignments (excluding current user)
  const otherAssignments = await db
    .select({ sessionParticipantId: expenseAssignments.sessionParticipantId, share: expenseAssignments.share })
    .from(expenseAssignments)
    .where(
      and(
        eq(expenseAssignments.expenseId, expenseId),
        // Note: We'll filter in JS since Drizzle doesn't have neq for this pattern easily
      )
    );

  const filteredOtherAssignments = otherAssignments.filter(
    (a) => a.sessionParticipantId !== sessionParticipantId
  );

  // Calculate new itemCount
  const newItemCount = calculateShareChange(
    expense.itemCount,
    oldShare,
    newShare,
    filteredOtherAssignments
  );

  // Update expense itemCount
  await db
    .update(expenses)
    .set({ itemCount: newItemCount })
    .where(eq(expenses.id, expenseId));

  // Update user's assignment
  await db
    .update(expenseAssignments)
    .set({ share: newShare })
    .where(
      and(
        eq(expenseAssignments.expenseId, expenseId),
        eq(expenseAssignments.sessionParticipantId, sessionParticipantId)
      )
    );

  // Return updated expense with assignments
  const assignments = await db
    .select({ sessionParticipantId: expenseAssignments.sessionParticipantId, share: expenseAssignments.share })
    .from(expenseAssignments)
    .where(eq(expenseAssignments.expenseId, expenseId));

  return apiSuccess({ ...expense, itemCount: newItemCount, assignments });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId, eid: expenseId } = await parseRouteParams(params);

  // Check for sessionParticipantId query param (user-specific deletion)
  const url = new URL(request.url);
  const sessionParticipantIdParam = url.searchParams.get('sessionParticipantId');

  if (sessionParticipantIdParam) {
    const sessionParticipantId = parseInt(sessionParticipantIdParam, 10);
    if (isNaN(sessionParticipantId)) {
      return apiError('Invalid sessionParticipantId', 400);
    }

    // Get current expense
    const [expense] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.sessionId, sessionId)));

    if (!expense) {
      return apiSuccess({ success: true });
    }

    return handleUserDeletion(sessionId, expenseId, sessionParticipantId, expense);
  }

  // Legacy full expense deletion (for admin)
  return handleFullDeletion(sessionId, expenseId);
}

/**
 * Handle user-specific deletion with itemCount adjustment
 */
async function handleUserDeletion(
  sessionId: number,
  expenseId: number,
  sessionParticipantId: number,
  expense: { id: number; name: string; itemCount: number }
) {
  // Get user's current assignment
  const [userAssignment] = await db
    .select()
    .from(expenseAssignments)
    .where(
      and(
        eq(expenseAssignments.expenseId, expenseId),
        eq(expenseAssignments.sessionParticipantId, sessionParticipantId)
      )
    );

  if (!userAssignment) {
    return apiSuccess({ success: true });
  }

  // Get other assignments
  const otherAssignments = await db
    .select({ sessionParticipantId: expenseAssignments.sessionParticipantId, share: expenseAssignments.share })
    .from(expenseAssignments)
    .where(eq(expenseAssignments.expenseId, expenseId));

  const filteredOtherAssignments = otherAssignments.filter(
    (a) => a.sessionParticipantId !== sessionParticipantId
  );

  // Delete user's assignment
  await db
    .delete(expenseAssignments)
    .where(
      and(
        eq(expenseAssignments.expenseId, expenseId),
        eq(expenseAssignments.sessionParticipantId, sessionParticipantId)
      )
    );

  // If no other assignments remain, delete the entire expense
  if (filteredOtherAssignments.length === 0) {
    return handleFullDeletion(sessionId, expenseId);
  }

  // Calculate new itemCount
  const newItemCount = calculateDeletion(expense.itemCount, userAssignment.share, filteredOtherAssignments);

  // Update expense itemCount
  await db
    .update(expenses)
    .set({ itemCount: newItemCount })
    .where(eq(expenses.id, expenseId));

  return apiSuccess({ success: true, itemCount: newItemCount });
}

/**
 * Handle full expense deletion (legacy admin behavior)
 */
async function handleFullDeletion(sessionId: number, expenseId: number) {
  // Get the expense name before deleting
  const [expense] = await db
    .select({ name: expenses.name })
    .from(expenses)
    .where(
      and(
        eq(expenses.id, expenseId),
        eq(expenses.sessionId, sessionId)
      )
    );

  if (!expense) {
    return apiSuccess({ success: true });
  }

  // Delete the expense
  await db
    .delete(expenses)
    .where(
      and(
        eq(expenses.id, expenseId),
        eq(expenses.sessionId, sessionId)
      )
    );

  // Check if any other expenses use this name
  const remainingExpenses = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(eq(expenses.name, expense.name))
    .limit(1);

  // If no other expenses use this name, delete the template (if not system)
  if (remainingExpenses.length === 0) {
    await db
      .delete(expenseTemplates)
      .where(
        and(
          eq(expenseTemplates.name, expense.name),
          eq(expenseTemplates.isSystem, false)
        )
      );
  }

  return apiSuccess({ success: true });
}
