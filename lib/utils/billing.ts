import { DEFAULT_EXPENSE_NAME } from '@/lib/constants';
import type { ParticipantBill } from '@/lib/types';

export interface ExpenseWithAssignments {
  id: number;
  name: string;
  itemCount: number;
  totalCost: number | null;
  assignments: {
    sessionParticipantId: number;
    participantName: string;
    share: number;
  }[];
}

export function generateBillRequestText(
  totalPeople: number,
  expenses: { name: string; itemCount: number }[]
): string {
  const additionalItems = expenses
    .filter(e => e.name !== DEFAULT_EXPENSE_NAME)
    .map(e => `${e.name} - ${e.itemCount}`);

  let text = `Посчитайте нас, пожалуйста.\n${totalPeople} чел`;

  if (additionalItems.length > 0) {
    text += '\n' + additionalItems.join('\n');
  }

  return text;
}

function createInitialBill(participant: {
  id: number;
  participantId: number;
  name: string;
  personCount: number;
}): ParticipantBill {
  return {
    sessionParticipantId: participant.id,
    participantId: participant.participantId,
    participantName: participant.name,
    personCount: participant.personCount,
    total: 0,
    breakdown: [],
  };
}

function processExpenseForBills(
  expense: ExpenseWithAssignments,
  billsBySessionParticipantId: Map<number, ParticipantBill>
): void {
  if (expense.totalCost === null) return;

  const totalShares = expense.assignments.reduce((sum, a) => sum + a.share, 0);
  if (totalShares === 0) return;

  const costPerShare = expense.totalCost / totalShares;

  for (const assignment of expense.assignments) {
    const bill = billsBySessionParticipantId.get(assignment.sessionParticipantId);
    if (bill) {
      const cost = assignment.share * costPerShare;
      bill.total += cost;
      bill.breakdown.push({
        expenseId: expense.id,
        expenseName: expense.name,
        share: assignment.share,
        cost,
      });
    }
  }
}

function roundBillTotals(bills: ParticipantBill[]): void {
  for (const bill of bills) {
    bill.total = Math.round(bill.total);
    for (const item of bill.breakdown) {
      item.cost = Math.round(item.cost * 100) / 100;
    }
  }
}

export function calculateBills(
  participants: { id: number; participantId: number; name: string; personCount: number }[],
  expenses: ExpenseWithAssignments[]
): ParticipantBill[] {
  const billsBySessionParticipantId = new Map<number, ParticipantBill>();

  const bills: ParticipantBill[] = participants.map(p => {
    const bill = createInitialBill(p);
    billsBySessionParticipantId.set(p.id, bill);
    return bill;
  });

  for (const expense of expenses) {
    processExpenseForBills(expense, billsBySessionParticipantId);
  }

  roundBillTotals(bills);

  return bills;
}

export function formatSessionDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
