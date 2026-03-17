import { describe, it, expect } from 'vitest'
import {
  POSITION_STEP,
  REBALANCE_THRESHOLD,
  calculateInsertPosition,
  needsRebalance,
  rebalancePositions,
} from './todoPosition'

describe('todoPosition utilities', () => {
  describe('constants', () => {
    it('should have POSITION_STEP set to 65536', () => {
      expect(POSITION_STEP).toBe(65536)
    })

    it('should have REBALANCE_THRESHOLD set to 10', () => {
      expect(REBALANCE_THRESHOLD).toBe(10)
    })
  })

  describe('calculateInsertPosition', () => {
    describe('empty list scenarios', () => {
      it('should return POSITION_STEP when both prev and next are null (empty list)', () => {
        const result = calculateInsertPosition(null, null)
        expect(result).toBe(POSITION_STEP)
      })
    })

    describe('insert at start', () => {
      it('should return next/2 when prev is null (insert at start)', () => {
        const result = calculateInsertPosition(null, 100000)
        expect(result).toBe(50000)
      })

      it('should handle next value of 2 (minimum valid position)', () => {
        const result = calculateInsertPosition(null, 2)
        expect(result).toBe(1)
      })

      it('should handle next value of POSITION_STEP', () => {
        const result = calculateInsertPosition(null, POSITION_STEP)
        expect(result).toBe(POSITION_STEP / 2)
      })
    })

    describe('insert at end', () => {
      it('should return prev + POSITION_STEP when next is null (insert at end)', () => {
        const result = calculateInsertPosition(100000, null)
        expect(result).toBe(100000 + POSITION_STEP)
      })

      it('should handle prev value of 0 (edge case)', () => {
        const result = calculateInsertPosition(0, null)
        expect(result).toBe(POSITION_STEP)
      })
    })

    describe('insert between items', () => {
      it('should return midpoint between prev and next', () => {
        const result = calculateInsertPosition(100000, 200000)
        expect(result).toBe(150000)
      })

      it('should handle consecutive positions (1 and 2)', () => {
        const result = calculateInsertPosition(1, 2)
        expect(result).toBe(1.5)
      })

      it('should handle large gap between positions', () => {
        const result = calculateInsertPosition(1000, 100000)
        expect(result).toBe(50500)
      })

      it('should return integer when difference is even', () => {
        const result = calculateInsertPosition(100, 300)
        expect(result).toBe(200)
        expect(Number.isInteger(result)).toBe(true)
      })

      it('should return decimal when difference is odd', () => {
        const result = calculateInsertPosition(100, 201)
        expect(result).toBe(150.5)
      })
    })

    describe('edge cases', () => {
      it('should handle same prev and next (edge case - would need rebalance)', () => {
        // When prev === next, midpoint is the same value
        const result = calculateInsertPosition(100, 100)
        expect(result).toBe(100)
      })

      it('should handle very large position values', () => {
        const largeValue = Number.MAX_SAFE_INTEGER - POSITION_STEP
        const result = calculateInsertPosition(largeValue, null)
        expect(result).toBe(largeValue + POSITION_STEP)
      })
    })
  })

  describe('needsRebalance', () => {
    describe('empty and single item lists', () => {
      it('should return false for empty array', () => {
        expect(needsRebalance([])).toBe(false)
      })

      it('should return false for single item array', () => {
        expect(needsRebalance([100])).toBe(false)
      })
    })

    describe('positions that need rebalancing', () => {
      it('should return true when positions differ by less than threshold (9)', () => {
        expect(needsRebalance([100, 109])).toBe(true)
      })

      it('should return true when positions differ by threshold-1', () => {
        expect(needsRebalance([100, 108])).toBe(true)
      })

      it('should return true when any adjacent pair is too close', () => {
        // 100 and 109 are too close (diff = 9 < 10)
        expect(needsRebalance([100, 109, 50000, 100000])).toBe(true)
      })

      it('should return true for consecutive integers (diff = 1)', () => {
        expect(needsRebalance([1, 2, 3, 4, 5])).toBe(true)
      })

      it('should return true when positions are unsorted but close', () => {
        // Sorted: [100, 105, 110] - differences are 5 and 5
        expect(needsRebalance([110, 100, 105])).toBe(true)
      })
    })

    describe('positions that do not need rebalancing', () => {
      it('should return false when positions differ by exactly threshold', () => {
        expect(needsRebalance([100, 110])).toBe(false)
      })

      it('should return false when positions differ by more than threshold', () => {
        expect(needsRebalance([100, 111])).toBe(false)
      })

      it('should return false for well-spaced positions', () => {
        // Standard POSITION_STEP spacing
        expect(needsRebalance([65536, 131072, 196608])).toBe(false)
      })

      it('should return false for positions with large gaps', () => {
        expect(needsRebalance([100, 100000, 1000000])).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('should handle negative positions', () => {
        // Note: negative positions are unusual but should not crash
        // -90 - (-100) = 10, exactly at threshold (not needing rebalance)
        expect(needsRebalance([-100, -90])).toBe(false)
        // -95 - (-100) = 5, below threshold (needs rebalance)
        expect(needsRebalance([-100, -95])).toBe(true)
      })

      it('should handle duplicate positions', () => {
        // Difference is 0, which is less than threshold
        expect(needsRebalance([100, 100, 200])).toBe(true)
      })

      it('should handle floating point positions', () => {
        // 1.5 - 1 = 0.5 < 10
        expect(needsRebalance([1, 1.5])).toBe(true)
      })
    })
  })

  describe('rebalancePositions', () => {
    describe('basic functionality', () => {
      it('should generate positions for count of 1', () => {
        const result = rebalancePositions(1)
        expect(result).toEqual([POSITION_STEP])
      })

      it('should generate positions for count of 3', () => {
        const result = rebalancePositions(3)
        expect(result).toEqual([POSITION_STEP, POSITION_STEP * 2, POSITION_STEP * 3])
      })

      it('should generate positions for count of 5', () => {
        const result = rebalancePositions(5)
        expect(result).toEqual([
          POSITION_STEP,
          POSITION_STEP * 2,
          POSITION_STEP * 3,
          POSITION_STEP * 4,
          POSITION_STEP * 5,
        ])
      })
    })

    describe('custom start and step', () => {
      it('should use custom start position', () => {
        const result = rebalancePositions(3, 100000)
        expect(result).toEqual([
          100000 + POSITION_STEP,
          100000 + POSITION_STEP * 2,
          100000 + POSITION_STEP * 3,
        ])
      })

      it('should use custom step', () => {
        const result = rebalancePositions(3, 0, 100)
        expect(result).toEqual([100, 200, 300])
      })

      it('should use custom start and step together', () => {
        const result = rebalancePositions(2, 500, 1000)
        expect(result).toEqual([1500, 2500])
      })
    })

    describe('edge cases', () => {
      it('should return empty array for count of 0', () => {
        const result = rebalancePositions(0)
        expect(result).toEqual([])
      })

      it('should handle large count', () => {
        const result = rebalancePositions(100)
        expect(result).toHaveLength(100)
        expect(result[0]).toBe(POSITION_STEP)
        expect(result[99]).toBe(POSITION_STEP * 100)
      })
    })

    describe('integration with calculateInsertPosition', () => {
      it('should generate positions that do not need rebalancing', () => {
        const positions = rebalancePositions(10)
        expect(needsRebalance(positions)).toBe(false)
      })

      it('should allow inserting at start of rebalanced list', () => {
        const positions = rebalancePositions(3)
        // Insert at start: null, positions[0]
        const insertPos = calculateInsertPosition(null, positions[0])
        expect(insertPos).toBe(positions[0] / 2)
        expect(insertPos).toBeGreaterThan(0)
        expect(insertPos).toBeLessThan(positions[0])
      })

      it('should allow inserting at end of rebalanced list', () => {
        const positions = rebalancePositions(3)
        // Insert at end: positions[2], null
        const insertPos = calculateInsertPosition(positions[2], null)
        expect(insertPos).toBe(positions[2] + POSITION_STEP)
      })

      it('should allow inserting between items in rebalanced list', () => {
        const positions = rebalancePositions(3)
        // Insert between first and second
        const insertPos = calculateInsertPosition(positions[0], positions[1])
        expect(insertPos).toBe((positions[0] + positions[1]) / 2)
        expect(insertPos).toBeGreaterThan(positions[0])
        expect(insertPos).toBeLessThan(positions[1])
      })
    })
  })
})