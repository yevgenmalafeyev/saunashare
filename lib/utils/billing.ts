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

export function calculateBills(
  participants: { id: number; participantId: number; name: string; personCount: number }[],
  expenses: ExpenseWithAssignments[]
): ParticipantBill[] {
  // Build lookup map for O(1) access
  const billsBySessionParticipantId = new Map<number, ParticipantBill>();

  const bills: ParticipantBill[] = participants.map(p => {
    const bill: ParticipantBill = {
      sessionParticipantId: p.id,
      participantId: p.participantId,
      participantName: p.name,
      personCount: p.personCount,
      total: 0,
      breakdown: [],
    };
    billsBySessionParticipantId.set(p.id, bill);
    return bill;
  });

  for (const expense of expenses) {
    if (expense.totalCost === null) continue;

    const totalShares = expense.assignments.reduce((sum, a) => sum + a.share, 0);
    if (totalShares === 0) continue;

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

  // Round totals
  for (const bill of bills) {
    bill.total = Math.round(bill.total);
    for (const item of bill.breakdown) {
      item.cost = Math.round(item.cost * 100) / 100;
    }
  }

  return bills;
}

export function formatSessionDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
