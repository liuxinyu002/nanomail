/**
 * Position utilities for drag-and-drop ordering of todos.
 * Uses large-integer algorithm for stable ordering without needing to update all items.
 */

/** Default step between positions */
export const POSITION_STEP = 65536

/** Minimum difference between positions before rebalancing is needed */
export const REBALANCE_THRESHOLD = 10

/**
 * Calculate position for inserting between two items.
 * Uses large-integer algorithm for stable ordering.
 *
 * @param prev - Position of previous item (null if inserting at start)
 * @param next - Position of next item (null if inserting at end)
 * @returns The calculated position for the new item
 *
 * @example
 * // Insert first item in empty list
 * calculateInsertPosition(null, null) // Returns 65536
 *
 * @example
 * // Insert at start of list
 * calculateInsertPosition(null, 100000) // Returns 50000
 *
 * @example
 * // Insert at end of list
 * calculateInsertPosition(100000, null) // Returns 165536
 *
 * @example
 * // Insert between items
 * calculateInsertPosition(100000, 200000) // Returns 150000
 */
export function calculateInsertPosition(
  prev: number | null,
  next: number | null
): number {
  // Empty list - first item gets default position
  if (prev === null && next === null) {
    return POSITION_STEP
  }

  // Insert at start - halve the first position
  if (prev === null) {
    return next! / 2
  }

  // Insert at end - add step to last position
  if (next === null) {
    return prev + POSITION_STEP
  }

  // Insert between items - average the positions
  return (prev + next) / 2
}

/**
 * Check if positions need rebalancing (values too close together).
 *
 * @param positions - Array of position values to check
 * @returns true if any adjacent positions are closer than REBALANCE_THRESHOLD
 *
 * @example
 * // Well-spaced positions don't need rebalancing
 * needsRebalance([65536, 131072, 196608]) // Returns false
 *
 * @example
 * // Positions too close together need rebalancing
 * needsRebalance([100, 105, 110]) // Returns true (diff is 5 < 10)
 */
export function needsRebalance(positions: number[]): boolean {
  // Empty or single item lists don't need rebalancing
  if (positions.length < 2) {
    return false
  }

  // Sort positions to check adjacent values
  const sorted = [...positions].sort((a, b) => a - b)

  // Check if any adjacent positions are too close
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] < REBALANCE_THRESHOLD) {
      return true
    }
  }

  return false
}

/**
 * Generate new evenly-spaced positions for rebalancing.
 *
 * @param count - Number of positions to generate
 * @param start - Starting position (default: 0)
 * @param step - Step between positions (default: POSITION_STEP)
 * @returns Array of new position values
 *
 * @example
 * // Generate default positions
 * rebalancePositions(3) // Returns [65536, 131072, 196608]
 *
 * @example
 * // Generate positions with custom start
 * rebalancePositions(3, 100000) // Returns [165536, 231072, 296608]
 *
 * @example
 * // Generate positions with custom step
 * rebalancePositions(3, 0, 100) // Returns [100, 200, 300]
 */
export function rebalancePositions(
  count: number,
  start: number = 0,
  step: number = POSITION_STEP
): number[] {
  return Array.from({ length: count }, (_, i) => start + (i + 1) * step)
}