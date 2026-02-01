import { db } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { getSessionParticipantsWithPayment, getExpensesWithAssignments } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { BillDisplay } from '@/components/session/billing/BillDisplay';
import { calculateBills } from '@/lib/utils/billing';

export const dynamic = 'force-dynamic';

interface DisplayPageProps {
  params: Promise<{ id: string }>;
}

export default async function BillDisplayPage({ params }: DisplayPageProps) {
  const { id } = await params;
  const sessionId = parseInt(id);

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session) {
    notFound();
  }

  const allParticipants = await getSessionParticipantsWithPayment(sessionId);
  const expensesWithAssignments = await getExpensesWithAssignments(sessionId);

  const bills = calculateBills(allParticipants, expensesWithAssignments);

  // Add payment status to bills
  const billsWithPayment = bills.map((bill) => {
    const participant = allParticipants.find((p) => p.id === bill.sessionParticipantId);
    return {
      ...bill,
      hasPaid: participant?.hasPaid ?? false,
    };
  });

  const grandTotal = bills.reduce((sum, b) => sum + b.total, 0);
  const expenseTotal = expensesWithAssignments.reduce(
    (sum, e) => sum + (e.totalCost || 0),
    0
  );
  const balance = grandTotal - expenseTotal;

  return (
    <BillDisplay
      bills={billsWithPayment}
      grandTotal={grandTotal}
      sessionName={session.name}
      sessionId={sessionId}
      balance={balance}
      expenseTotal={expenseTotal}
    />
  );
}
