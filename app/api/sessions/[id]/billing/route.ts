import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { sessionParticipants, expenses } from '@/lib/db/schema';
import { getSessionParticipantsWithPayment, getExpensesWithAssignments } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { generateBillRequestText, calculateBills } from '@/lib/utils/billing';
import { extractExpensesFromImage } from '@/lib/claude/image-processor';
import { parseRouteParams, apiError, apiSuccess } from '@/lib/utils/api';
import { BILLING_TYPE, BILLING_ACTION } from '@/lib/constants';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || BILLING_TYPE.REQUEST;

  switch (type) {
    case BILLING_TYPE.REQUEST:
      return handleRequest(sessionId);
    case BILLING_TYPE.CALCULATE:
      return handleCalculate(sessionId);
    default:
      return apiError('Invalid type', 400);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await parseRouteParams(params);
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || BILLING_ACTION.MATCH;

  switch (action) {
    case BILLING_ACTION.MATCH:
      return handleMatch(sessionId, request);
    case BILLING_ACTION.APPLY:
      return handleApply(sessionId, request);
    default:
      return apiError('Invalid action', 400);
  }
}

async function handleRequest(sessionId: number) {
  const allParticipants = await db
    .select()
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, sessionId));

  const totalPeople = allParticipants.reduce((sum, p) => sum + p.personCount, 0);

  const allExpenses = await db
    .select({ name: expenses.name, itemCount: expenses.itemCount })
    .from(expenses)
    .where(eq(expenses.sessionId, sessionId));

  const text = generateBillRequestText(totalPeople, allExpenses);
  return apiSuccess({ text });
}

async function handleCalculate(sessionId: number) {
  const allParticipants = await getSessionParticipantsWithPayment(sessionId);
  const expensesWithAssignments = await getExpensesWithAssignments(sessionId);

  const issues: string[] = [];

  const expensesWithoutCost = expensesWithAssignments.filter((e) => e.totalCost === null);
  if (expensesWithoutCost.length > 0) {
    issues.push(`${expensesWithoutCost.length} expense(s) missing cost`);
  }

  const expensesWithoutAssignments = expensesWithAssignments.filter(
    (e) => e.assignments.length === 0
  );
  if (expensesWithoutAssignments.length > 0) {
    issues.push(`${expensesWithoutAssignments.length} expense(s) have no assignments`);
  }

  if (allParticipants.length === 0) {
    issues.push('No participants in session');
  }

  const ready = issues.length === 0;
  const bills = ready ? calculateBills(allParticipants, expensesWithAssignments) : [];

  // Add payment status to each bill
  const billsWithPayment = bills.map((bill) => {
    const participant = allParticipants.find((p) => p.id === bill.sessionParticipantId);
    return {
      ...bill,
      hasPaid: participant?.hasPaid ?? false,
    };
  });

  const grandTotal = billsWithPayment.reduce((sum, b) => sum + b.total, 0);
  const expenseTotal = expensesWithAssignments.reduce(
    (sum, e) => sum + (e.totalCost || 0),
    0
  );
  const balance = grandTotal - expenseTotal;

  // Include expenses missing cost for manual entry
  const missingCostExpenses = expensesWithoutCost.map((e) => ({
    id: e.id,
    name: e.name,
    itemCount: e.itemCount,
  }));

  return apiSuccess({ ready, issues, bills: billsWithPayment, grandTotal, expenseTotal, balance, missingCostExpenses });
}

async function handleMatch(sessionId: number, request: NextRequest) {
  const { image } = await request.json();

  // Get expected expenses
  const allExpenses = await db
    .select({ name: expenses.name, itemCount: expenses.itemCount })
    .from(expenses)
    .where(eq(expenses.sessionId, sessionId));

  const result = await extractExpensesFromImage(image, allExpenses);

  return apiSuccess(result);
}

async function handleApply(sessionId: number, request: NextRequest) {
  const { expenses: extractedExpenses } = await request.json();

  // Get session expenses
  const sessionExpenses = await db
    .select()
    .from(expenses)
    .where(eq(expenses.sessionId, sessionId));

  // Match and update costs
  for (const extracted of extractedExpenses) {
    const matchingExpense = sessionExpenses.find(
      (e) => e.name.toLowerCase() === extracted.name.toLowerCase()
    );

    if (matchingExpense) {
      await db
        .update(expenses)
        .set({ totalCost: extracted.cost })
        .where(eq(expenses.id, matchingExpense.id));
    }
  }

  return apiSuccess({ success: true });
}
