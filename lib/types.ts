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
  hasPaid?: boolean;
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
  sessionParticipantId: number;
  participantId: number;
  participantName: string;
  personCount: number;
  total: number;
  hasPaid?: boolean;
  breakdown: {
    expenseId?: number;
    expenseName: string;
    share: number;
    cost: number;
  }[];
}

/** Session data as returned by the API */
export interface Session {
  id: number;
  name: string;
  hidden: boolean;
  createdAt: string;
  participantCount: number;
  dutyPerson?: 'artur' | 'andrey' | null;
  isDeletable?: boolean;
}

/** An expense extracted from a bill image via Claude */
export interface ExtractedExpense {
  name: string;
  count: number;
  cost: number;
}

/** Expense template for quick expense creation */
export interface ExpenseTemplate {
  id: number;
  name: string;
  usageCount: number;
  isSystem: boolean;
}

/** Participant suggestion for adding to session */
export interface ParticipantSuggestion {
  id: number;
  name: string;
  activityScore: number;
  recentPersonCount: number;
}

/** A user's expense assignment with expense details (used in user expense list) */
export interface UserExpenseAssignment {
  expenseId: number;
  expenseName: string;
  itemCount: number;
  share: number;
  totalCost: number | null;
}
