import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { expenses, expenseAssignments, expenseTemplates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseRouteParams, apiSuccess } from '@/lib/utils/api';
import { validateUpdateExpense, validateUpdateAssignments, validateAndRespond } from '@/lib/validation/schemas';

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

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id: sessionId, eid: expenseId } = await parseRouteParams(params);

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
