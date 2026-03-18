import { describe, it, expect } from 'vitest'

// Tests for barrel export
// These tests verify that all components are properly exported from the planner module
describe('Planner Module Exports', () => {
  describe('Phase 1 Components', () => {
    describe('TimeAxis Export', () => {
      it('should export TimeAxis component', async () => {
        const { TimeAxis } = await import('./index')
        expect(TimeAxis).toBeDefined()
        expect(typeof TimeAxis).toBe('function')
      })

      it('should export TimeAxisProps type', async () => {
        const { TimeAxis } = await import('./TimeAxis')
        // TypeScript types are erased at runtime, but we can verify the component exists
        expect(TimeAxis).toBeDefined()
      })
    })

    describe('CurrentTimeIndicator Export', () => {
      it('should export CurrentTimeIndicator component', async () => {
        const { CurrentTimeIndicator } = await import('./index')
        expect(CurrentTimeIndicator).toBeDefined()
        // Note: memo() components are objects, not functions
        expect(typeof CurrentTimeIndicator).toBe('object')
      })

      it('should export CurrentTimeIndicatorProps type', async () => {
        const { CurrentTimeIndicator } = await import('./CurrentTimeIndicator')
        // TypeScript types are erased at runtime, but we can verify the component exists
        expect(CurrentTimeIndicator).toBeDefined()
      })
    })
  })

  describe('Phase 2 Components', () => {
    describe('DayView Export', () => {
      it('should export DayView component', async () => {
        const { DayView } = await import('./index')
        expect(DayView).toBeDefined()
        expect(typeof DayView).toBe('function')
      })

      it('should export DayViewProps type', async () => {
        const { DayView } = await import('./DayView')
        expect(DayView).toBeDefined()
      })
    })

    describe('HourSlot Export', () => {
      it('should export HourSlot component', async () => {
        const { HourSlot } = await import('./index')
        expect(HourSlot).toBeDefined()
        expect(typeof HourSlot).toBe('function')
      })

      it('should export HourSlotProps type', async () => {
        const { HourSlot } = await import('./HourSlot')
        expect(HourSlot).toBeDefined()
      })
    })

    describe('PlannerTodoCard Export', () => {
      it('should export PlannerTodoCard component', async () => {
        const { PlannerTodoCard } = await import('./index')
        expect(PlannerTodoCard).toBeDefined()
        expect(typeof PlannerTodoCard).toBe('function')
      })

      it('should export PlannerTodoCardProps type', async () => {
        const { PlannerTodoCard } = await import('./PlannerTodoCard')
        expect(PlannerTodoCard).toBeDefined()
      })
    })
  })

  describe('Phase 3 Components', () => {
    describe('WeekView Export', () => {
      it('should export WeekView component', async () => {
        const { WeekView } = await import('./index')
        expect(WeekView).toBeDefined()
        expect(typeof WeekView).toBe('function')
      })

      it('should export WeekViewProps type', async () => {
        const { WeekView } = await import('./WeekView')
        expect(WeekView).toBeDefined()
      })
    })
  })

  describe('Module Structure', () => {
    it('should export all expected components', async () => {
      const module = await import('./index')

      // Phase 1
      expect(module.TimeAxis).toBeDefined()
      expect(module.CurrentTimeIndicator).toBeDefined()

      // Phase 2
      expect(module.DayView).toBeDefined()
      expect(module.HourSlot).toBeDefined()
      expect(module.PlannerTodoCard).toBeDefined()

      // Phase 3
      expect(module.WeekView).toBeDefined()

      // Type exports (verified at compile time)
      expect(module.TimeAxisProps).toBeUndefined() // Types are erased at runtime
      expect(module.CurrentTimeIndicatorProps).toBeUndefined()
      expect(module.DayViewProps).toBeUndefined()
      expect(module.HourSlotProps).toBeUndefined()
      expect(module.PlannerTodoCardProps).toBeUndefined()
      expect(module.WeekViewProps).toBeUndefined()
    })
  })
})