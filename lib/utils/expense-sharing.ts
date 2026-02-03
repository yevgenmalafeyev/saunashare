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
 *
 * @param itemCount Total item count for the expense
 * @param assignments All assignments for the expense
 * @returns Number of unassigned items (always >= 0)
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
 *
 * @param currentItemCount Current total item count for the expense
 * @param oldShare User's previous share amount
 * @param newShare User's new share amount
 * @param otherAssignments All other user assignments (excluding current user)
 * @returns New itemCount for the expense
 */
export function calculateShareChange(
  currentItemCount: number,
  oldShare: number,
  newShare: number,
  otherAssignments: Assignment[]
): number {
  const delta = newShare - oldShare;

  if (delta > 0) {
    return currentItemCount + delta;
  }

  if (delta < 0) {
    const reduction = Math.abs(delta);
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
 *
 * @param currentItemCount Current total item count for the expense
 * @param userShare Share amount being deleted
 * @param otherAssignments All other user assignments (excluding deleted user)
 * @returns New itemCount for the expense
 */
export function calculateDeletion(
  currentItemCount: number,
  userShare: number,
  otherAssignments: Assignment[]
): number {
  // Special case: 0.5 share deletion removes 1 from itemCount
  if (userShare === 0.5) {
    return Math.max(0, currentItemCount - 1);
  }

  const newItemCount = currentItemCount - userShare;
  const otherTotal = otherAssignments.reduce((sum, a) => sum + a.share, 0);

  return Math.max(otherTotal, newItemCount);
}

/**
 * Calculate itemCount when adding a new user to an existing expense
 *
 * @param currentItemCount Current total item count for the expense
 * @param newShare Share amount for the new user
 * @param existingAssignments All current assignments before adding new user
 * @returns New itemCount for the expense
 */
export function calculateAddition(
  currentItemCount: number,
  newShare: number,
  existingAssignments: Assignment[]
): number {
  const unassigned = calculateUnassigned(currentItemCount, existingAssignments);

  if (newShare <= unassigned) {
    return currentItemCount;
  }

  return currentItemCount + (newShare - unassigned);
}
