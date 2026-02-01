/**
 * Utility functions for dynamic expense sharing algorithm
 *
 * Rules:
 * 1. Each expense name exists only ONCE per session
 * 2. itemCount dynamically adjusts based on user share changes
 * 3. Unassigned items = itemCount - sum(all shares)
 */

export interface Assignment {
  sessionParticipantId: number;
  share: number;
}

/**
 * Calculate unassigned items for an expense
 */
export function calculateUnassigned(itemCount: number, assignments: Assignment[]): number {
  const totalAssigned = assignments.reduce((sum, a) => sum + a.share, 0);
  return Math.max(0, itemCount - totalAssigned);
}

/**
 * Calculate new itemCount when a user changes their share
 *
 * Rules:
 * - Increase share: itemCount += (newShare - oldShare)
 * - Decrease share: itemCount -= (oldShare - newShare)
 * - For non-integer reductions (e.g., 1.5, 2.5), floor the reduction
 *   This ensures reducing to 0.5 only creates 0.5 unassigned, not more
 */
export function calculateShareChange(
  currentItemCount: number,
  oldShare: number,
  newShare: number,
  otherAssignments: Assignment[]
): number {
  const delta = newShare - oldShare;

  if (delta > 0) {
    // Increasing share: always add to itemCount
    return currentItemCount + delta;
  } else if (delta < 0) {
    // Decreasing share
    const reduction = Math.abs(delta);

    // For non-integer reductions, floor the amount
    // e.g., reducing by 1.5 → reduce itemCount by 1, leaving 0.5 unassigned
    const actualReduction = Number.isInteger(reduction) ? reduction : Math.floor(reduction);

    const newItemCount = currentItemCount - actualReduction;

    // Ensure itemCount doesn't go below the sum of all shares after change
    const otherTotal = otherAssignments.reduce((sum, a) => sum + a.share, 0);
    return Math.max(otherTotal + newShare, newItemCount);
  }

  return currentItemCount;
}

/**
 * Calculate new itemCount when deleting a user's assignment
 *
 * Rules:
 * - Delete with share >= 1: itemCount -= share
 * - Delete with share = 0.5: itemCount -= 1
 */
export function calculateDeletion(
  currentItemCount: number,
  userShare: number,
  otherAssignments: Assignment[]
): number {
  if (userShare === 0.5) {
    // Special case: 0.5 share deletion removes 1 from itemCount
    return Math.max(0, currentItemCount - 1);
  }

  // Normal case: reduce by user's share
  const newItemCount = currentItemCount - userShare;

  // Ensure itemCount doesn't go below total of other assignments
  const otherTotal = otherAssignments.reduce((sum, a) => sum + a.share, 0);
  return Math.max(otherTotal, newItemCount);
}

/**
 * Calculate itemCount when adding a new user to an existing expense
 */
export function calculateAddition(
  currentItemCount: number,
  newShare: number,
  existingAssignments: Assignment[]
): number {
  const unassigned = calculateUnassigned(currentItemCount, existingAssignments);

  if (newShare <= unassigned) {
    // Enough unassigned items, no need to increase itemCount
    return currentItemCount;
  }

  // Need to increase itemCount
  return currentItemCount + (newShare - unassigned);
}
