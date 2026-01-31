/**
 * Shared type definitions used across the application.
 * These are frontend types that may differ from database schema types.
 */

/** A participant within a session context, including their name from the global participants table */
export interface SessionParticipant {
  id: number;
  participantId: number;
  name: string;
  personCount: number;
}

/** An assignment of an expense to a participant with their share */
export interface ExpenseAssignment {
  sessionParticipantId: number;
  share: number;
}

/** An expense with its assignments (used in the frontend) */
export interface Expense {
  id: number;
  name: string;
  itemCount: number;
  totalCost: number | null;
  assignments: ExpenseAssignment[];
}

/** A calculated bill for a single participant */
export interface ParticipantBill {
  participantId: number;
  participantName: string;
  personCount: number;
  total: number;
  breakdown: {
    expenseName: string;
    share: number;
    cost: number;
  }[];
}

/** An expense extracted from a bill image via Claude */
export interface ExtractedExpense {
  name: string;
  count: number;
  cost: number;
}
