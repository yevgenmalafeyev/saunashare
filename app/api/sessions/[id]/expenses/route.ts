import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { expenses, expenseAssignments, expenseTemplates, sessionParticipants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { DEFAULT_EXPENSE_NAME } from '@/lib/constants';
import { parseRouteParams, apiSuccess } from '@/lib/utils/api';
import { validateCreateExpense, validateAndRespond } from '@/lib/validation/schemas';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);

  const allExpenses = await db
    .select()
    .from(expenses)
    .where(eq(expenses.sessionId, sessionId));

  const result = await Promise.all(
    allExpenses.map(async (expense) => {
      const assignments = await db
        .select({
          sessionParticipantId: expenseAssignments.sessionParticipantId,
          share: expenseAssignments.share,
        })
        .from(expenseAssignments)
        .where(eq(expenseAssignments.expenseId, expense.id));

      return {
        ...expense,
        assignments,
      };
    })
  );

  return apiSuccess(result);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);
  const body = await request.json();
  const validated = validateAndRespond(validateCreateExpense, body);
  if (validated.error) return validated.error;

  const { name, itemCount } = validated.data;

  // Create or update expense template
  const [existingTemplate] = await db
    .select()
    .from(expenseTemplates)
    .where(eq(expenseTemplates.name, name));

  if (existingTemplate) {
    await db
      .update(expenseTemplates)
      .set({ usageCount: existingTemplate.usageCount + 1 })
      .where(eq(expenseTemplates.id, existingTemplate.id));
  } else {
    await db.insert(expenseTemplates).values({ name, usageCount: 1 });
  }

  // Create expense
  const [expense] = await db
    .insert(expenses)
    .values({ sessionId, name, itemCount: itemCount! })
    .returning();

  // If it's the default expense, auto-assign to all participants
  if (name === DEFAULT_EXPENSE_NAME) {
    const allParticipants = await db
      .select()
      .from(sessionParticipants)
      .where(eq(sessionParticipants.sessionId, sessionId));

    for (const sp of allParticipants) {
      await db.insert(expenseAssignments).values({
        expenseId: expense.id,
        sessionParticipantId: sp.id,
        share: sp.personCount,
      });
    }
  }

  return apiSuccess(expense, 201);
}
