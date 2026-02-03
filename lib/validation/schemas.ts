/**
 * Validation schemas for API request bodies
 */

import { apiError } from '@/lib/utils/api';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Helper to validate request body and return appropriate response
 * Returns either validated data or an error Response
 */
export function validateAndRespond<T>(
  validator: (data: unknown) => ValidationResult<T>,
  body: unknown
): { data: T; error?: never } | { data?: never; error: Response } {
  const validation = validator(body);
  if (!validation.success) {
    return { error: apiError(validation.error!, 400) };
  }
  return { data: validation.data! };
}

// Type guards
function isObject(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null;
}

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && value >= min && value <= max;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDutyPerson(value: unknown): value is 'artur' | 'andrey' | null {
  return value === 'artur' || value === 'andrey' || value === null;
}

function validate<T>(
  data: unknown,
  validator: (obj: Record<string, unknown>) => T | null,
  errorMessage: string
): ValidationResult<T> {
  if (!isObject(data)) {
    return { success: false, error: errorMessage };
  }
  const result = validator(data);
  if (result === null) {
    return { success: false, error: errorMessage };
  }
  return { success: true, data: result };
}

// Session schemas
export interface CreateSessionBody {
  name: string;
  dutyPerson?: 'artur' | 'andrey' | null;
}

export function validateCreateSession(data: unknown): ValidationResult<CreateSessionBody> {
  return validate(
    data,
    (obj) => {
      if (!isNonEmptyString(obj.name)) return null;
      const dutyPerson = isValidDutyPerson(obj.dutyPerson) ? obj.dutyPerson : null;
      return { name: obj.name.trim(), dutyPerson };
    },
    'Name is required and must be a non-empty string'
  );
}

export interface UpdateSessionBody {
  name: string;
}

export function validateUpdateSession(data: unknown): ValidationResult<UpdateSessionBody> {
  return validateCreateSession(data);
}

export interface PatchSessionBody {
  hidden?: boolean;
  dutyPerson?: 'artur' | 'andrey' | null;
}

export function validatePatchSession(data: unknown): ValidationResult<PatchSessionBody> {
  return validate(
    data,
    (obj) => {
      const result: PatchSessionBody = {};
      let hasValidField = false;

      if ('hidden' in obj) {
        if (typeof obj.hidden !== 'boolean') return null;
        result.hidden = obj.hidden;
        hasValidField = true;
      }

      if ('dutyPerson' in obj) {
        if (!isValidDutyPerson(obj.dutyPerson)) return null;
        result.dutyPerson = obj.dutyPerson;
        hasValidField = true;
      }

      return hasValidField ? result : null;
    },
    'Must provide hidden (boolean) or dutyPerson (artur/andrey/null)'
  );
}

// Participant schemas
export interface CreateParticipantBody {
  participantId?: number;
  name?: string;
  personCount: number;
}

export function validateCreateParticipant(data: unknown): ValidationResult<CreateParticipantBody> {
  return validate(
    data,
    (obj) => {
      const personCount = isNumberInRange(obj.personCount, 1, 10) ? obj.personCount : 1;

      if (typeof obj.participantId === 'number') {
        return { participantId: obj.participantId, personCount };
      }
      if (isNonEmptyString(obj.name)) {
        return { name: obj.name.trim(), personCount };
      }
      return null;
    },
    'Either participantId or name is required, personCount must be 1-10'
  );
}

export interface UpdateParticipantBody {
  personCount: number;
}

export function validateUpdateParticipant(data: unknown): ValidationResult<UpdateParticipantBody> {
  return validate(
    data,
    (obj) => {
      if (!isNumberInRange(obj.personCount, 1, 10)) return null;
      return { personCount: obj.personCount };
    },
    'personCount must be a number between 1 and 10'
  );
}

// Expense schemas
export interface CreateExpenseBody {
  name: string;
  itemCount?: number;
}

export function validateCreateExpense(data: unknown): ValidationResult<CreateExpenseBody> {
  return validate(
    data,
    (obj) => {
      if (!isNonEmptyString(obj.name)) return null;
      const itemCount = isNumberInRange(obj.itemCount, 1, 99) ? obj.itemCount : 1;
      return { name: obj.name.trim(), itemCount };
    },
    'Name is required, itemCount must be 1-99'
  );
}

export interface UpdateExpenseBody {
  name?: string;
  itemCount?: number;
  totalCost?: number | null;
}

export function validateUpdateExpense(data: unknown): ValidationResult<UpdateExpenseBody> {
  return validate(
    data,
    (obj) => {
      const result: UpdateExpenseBody = {};

      if ('name' in obj) {
        if (!isNonEmptyString(obj.name)) return null;
        result.name = (obj.name as string).trim();
      }

      if ('itemCount' in obj) {
        if (!isNumberInRange(obj.itemCount, 1, 99)) return null;
        result.itemCount = obj.itemCount;
      }

      if ('totalCost' in obj) {
        if (obj.totalCost !== null && typeof obj.totalCost !== 'number') return null;
        result.totalCost = obj.totalCost as number | null;
      }

      return result;
    },
    'name must be non-empty string, itemCount must be 1-99, totalCost must be a number or null'
  );
}

// Assignment schemas
export interface UpdateAssignmentsBody {
  assignments: Array<{
    sessionParticipantId: number;
    share: number;
  }>;
}

export function validateUpdateAssignments(data: unknown): ValidationResult<UpdateAssignmentsBody> {
  return validate(
    data,
    (obj) => {
      if (!Array.isArray(obj.assignments)) return null;

      const assignments = obj.assignments.map((a: unknown) => {
        if (!isObject(a)) return null;
        if (typeof a.sessionParticipantId !== 'number') return null;
        if (!isNonNegativeNumber(a.share)) return null;
        return {
          sessionParticipantId: a.sessionParticipantId,
          share: a.share,
        };
      });

      if (assignments.some((a) => a === null)) return null;
      return { assignments: assignments as UpdateAssignmentsBody['assignments'] };
    },
    'assignments must be an array of { sessionParticipantId: number, share: number }'
  );
}

// User expense schemas (for dynamic expense sharing)
export interface CreateUserExpenseBody {
  name: string;
  share?: number;
  sessionParticipantId: number;
}

export function validateCreateUserExpense(data: unknown): ValidationResult<CreateUserExpenseBody> {
  return validate(
    data,
    (obj) => {
      if (!isNonEmptyString(obj.name)) return null;
      if (typeof obj.sessionParticipantId !== 'number') return null;
      const share = isPositiveNumber(obj.share) ? obj.share : 1;
      return {
        name: obj.name.trim(),
        share,
        sessionParticipantId: obj.sessionParticipantId,
      };
    },
    'name and sessionParticipantId are required, share must be a positive number'
  );
}

export interface UpdateUserShareBody {
  sessionParticipantId: number;
  newShare: number;
}

export function validateUpdateUserShare(data: unknown): ValidationResult<UpdateUserShareBody> {
  return validate(
    data,
    (obj) => {
      if (typeof obj.sessionParticipantId !== 'number') return null;
      if (!isNonNegativeNumber(obj.newShare)) return null;
      return {
        sessionParticipantId: obj.sessionParticipantId,
        newShare: obj.newShare,
      };
    },
    'sessionParticipantId and newShare are required, newShare must be a non-negative number'
  );
}
