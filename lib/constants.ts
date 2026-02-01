export const DEFAULT_EXPENSE_NAME = 'Время, чай, вода';

export const PERSON_COUNT_OPTIONS = [1, 2, 3, 4] as const;
export const ITEM_COUNT_OPTIONS = [0.5, 1, 2, 3, 4, 5] as const;
export const SHARE_OPTIONS = [0, 0.5, 1, 2, 3, 4, 5] as const;

export const FEEDBACK_TIMEOUT_MS = 2000;

// Swipeable row constants
export const SWIPE_THRESHOLD_PX = 40;
export const SWIPE_ACTION_WIDTH_PX = 80;

export const JSON_HEADERS = {
  'Content-Type': 'application/json',
} as const;

// Billing route types
export const BILLING_TYPE = {
  REQUEST: 'request',
  CALCULATE: 'calculate',
} as const;

export const BILLING_ACTION = {
  MATCH: 'match',
  APPLY: 'apply',
} as const;
