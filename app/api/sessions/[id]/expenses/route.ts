import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { expenses, expenseAssignments, expenseTemplates, sessionParticipants } from '@/lib/db/schema';
import { getExpensesWithBasicAssignments } from '@/lib/db/queries';
import { eq, and } from 'drizzle-orm';
import { DEFAULT_EXPENSE_NAME } from '@/lib/constants';
import { parseRouteParams, apiSuccess, apiError } from '@/lib/utils/api';
import { validateCreateExpense, validateCreateUserExpense, validateAndRespond } from '@/lib/validation/schemas';
import { calculateAddition } from '@/lib/utils/expense-sharing';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);
  const result = await getExpensesWithBasicAssignments(sessionId);
  return apiSuccess(result);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);
  const body = await request.json();

  // Check if this is a user expense request (has sessionParticipantId)
  if ('sessionParticipantId' in body) {
    return handleUserExpense(sessionId, body);
  }

  // Legacy admin expense creation
  return handleAdminExpense(sessionId, body);
}

/**
 * Handle user expense creation with find-or-create logic
 */
async function handleUserExpense(sessionId: number, body: unknown) {
  const validated = validateAndRespond(validateCreateUserExpense, body);
  if (validated.error) return validated.error;

  const { name, share, sessionParticipantId } = validated.data;

  // Update or create expense template
  await updateExpenseTemplate(name);

  // Check if expense with same name already exists in this session
  const [existingExpense] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.sessionId, sessionId), eq(expenses.name, name)));

  if (existingExpense) {
    // Expense exists - check if user already has an assignment
    const [existingAssignment] = await db
      .select()
      .from(expenseAssignments)
      .where(
        and(
          eq(expenseAssignments.expenseId, existingExpense.id),
          eq(expenseAssignments.sessionParticipantId, sessionParticipantId)
        )
      );

    if (existingAssignment) {
      return apiError('User already has this expense assigned', 400);
    }

    // Get all current assignments
    const currentAssignments = await db
      .select({ sessionParticipantId: expenseAssignments.sessionParticipantId, share: expenseAssignments.share })
      .from(expenseAssignments)
      .where(eq(expenseAssignments.expenseId, existingExpense.id));

    // Calculate new itemCount
    const newItemCount = calculateAddition(existingExpense.itemCount, share!, currentAssignments);

    // Update itemCount
    await db
      .update(expenses)
      .set({ itemCount: newItemCount })
      .where(eq(expenses.id, existingExpense.id));

    // Add assignment for this user
    await db.insert(expenseAssignments).values({
      expenseId: existingExpense.id,
      sessionParticipantId,
      share: share!,
    });

    // Return updated expense with assignments
    const assignments = await db
      .select({ sessionParticipantId: expenseAssignments.sessionParticipantId, share: expenseAssignments.share })
      .from(expenseAssignments)
      .where(eq(expenseAssignments.expenseId, existingExpense.id));

    return apiSuccess({ ...existingExpense, itemCount: newItemCount, assignments });
  }

  // Create new expense with itemCount = share
  const [expense] = await db
    .insert(expenses)
    .values({ sessionId, name, itemCount: share! })
    .returning();

  // Create assignment for this user
  await db.insert(expenseAssignments).values({
    expenseId: expense.id,
    sessionParticipantId,
    share: share!,
  });

  return apiSuccess({ ...expense, assignments: [{ sessionParticipantId, share }] }, 201);
}

/**
 * Handle legacy admin expense creation
 */
async function handleAdminExpense(sessionId: number, body: unknown) {
  const validated = validateAndRespond(validateCreateExpense, body);
  if (validated.error) return validated.error;

  const { name, itemCount } = validated.data;

  // Update or create expense template
  await updateExpenseTemplate(name);

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

/**
 * Update or create expense template
 */
async function updateExpenseTemplate(name: string) {
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
}
