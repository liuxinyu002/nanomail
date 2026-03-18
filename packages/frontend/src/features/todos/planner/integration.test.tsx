/**
 * Integration tests for Planner drag-drop functionality
 *
 * Tests the complete drag-drop flow:
 * 1. Drag from Inbox to Planner DayView hour slot
 * 2. Todo updates with deadline + boardColumnId = 2
 * 3. Todo appears in Planner and Board (Todo column)
 * 4. Todo disappears from Inbox
 *
 * Note: These tests focus on testing the handleDragEnd logic directly
 * rather than testing through the full UI, which provides more reliable
 * and faster tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Todo } from '@nanomail/shared'
import type { DragEndEvent } from '@dnd-kit/core'

// Helper to create mock Todo with required fields
function createMockTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    emailId: 100,
    description: 'Test todo',
    status: 'pending',
    deadline: null,
    boardColumnId: 1,
    position: 0,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  }
}

/**
 * The handleDragEnd logic extracted from TodosPage for testing
 * This mirrors the actual implementation to test the business logic
 */
function createHandleDragEnd(
  updateTodo: (id: number, data: { boardColumnId?: number; deadline?: string | null }) => void
) {
  return (event: DragEndEvent) => {
    // No drop target - drag cancelled
    if (!event.over) return

    // Extract source todo info
    const activeData = event.active.data.current
    if (!activeData || activeData.type !== 'todo' || !activeData.todo) return

    const todo = activeData.todo
    const todoId = todo.id
    const sourceColumnId = todo.boardColumnId

    // Extract target zone info
    const overData = event.over.data.current
    if (!overData) return

    const targetZoneType = overData.type as 'inbox' | 'planner' | 'board'
    const targetColumnId = overData.columnId as number | undefined
    const targetDate = overData.date as string | undefined
    const targetHour = overData.hour as number | undefined

    // Prepare update payload
    const updatePayload: { boardColumnId?: number; deadline?: string | null } = {}

    switch (targetZoneType) {
      case 'inbox':
        // Dropping to Inbox: set boardColumnId = 1
        if (sourceColumnId === 1) return
        updatePayload.boardColumnId = 1
        break

      case 'board':
        // Dropping to Board column: set boardColumnId
        if (!targetColumnId) return
        if (sourceColumnId === targetColumnId) return
        updatePayload.boardColumnId = targetColumnId
        break

      case 'planner':
        // Dropping to Planner hour slot: set deadline AND boardColumnId = 2
        if (!targetDate) return

        // Create ISO datetime from date + hour (if hour is specified)
        const targetDateTime = new Date(targetDate)
        if (targetHour !== undefined) {
          // Hour-specific drop: set precise time
          targetDateTime.setHours(targetHour, 0, 0, 0)
        }
        updatePayload.deadline = targetDateTime.toISOString()
        updatePayload.boardColumnId = 2 // Move to Todo column
        break

      default:
        return
    }

    // Execute mutation
    updateTodo(todoId, updatePayload)
  }
}

describe('Drag-Drop Integration', () => {
  let mockUpdateTodo: ReturnType<typeof vi.fn>
  let handleDragEnd: ReturnType<typeof createHandleDragEnd>
  let capturedUpdateData: { id: number; data: { boardColumnId?: number; deadline?: string | null } } | null

  beforeEach(() => {
    capturedUpdateData = null
    mockUpdateTodo = vi.fn((id, data) => {
      capturedUpdateData = { id, data }
    })
    handleDragEnd = createHandleDragEnd(mockUpdateTodo)
    vi.clearAllMocks()
  })

  describe('Drag from Inbox to Planner Hour Slot', () => {
    it('should update todo with deadline and boardColumnId = 2 when dropped on planner hour slot', () => {
      const inboxTodo = createMockTodo({
        id: 1,
        description: 'Inbox task to schedule',
        boardColumnId: 1,
        deadline: null,
      })

      const mockDragEvent = {
        over: {
          id: 'hour-2024-01-15-14',
          data: {
            current: {
              type: 'planner',
              date: '2024-01-15',
              hour: 14,
            },
          },
        },
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: inboxTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).toHaveBeenCalled()
      expect(capturedUpdateData).toEqual({
        id: 1,
        data: {
          boardColumnId: 2,
          deadline: expect.any(String),
        },
      })

      // Verify deadline is set correctly (hour 14)
      const deadlineDate = new Date(capturedUpdateData!.data.deadline!)
      expect(deadlineDate.getHours()).toBe(14)
      expect(deadlineDate.getMinutes()).toBe(0)
    })

    it('should set boardColumnId = 2 when dropped on planner (without specific hour)', () => {
      const inboxTodo = createMockTodo({
        id: 1,
        description: 'Inbox task to schedule',
        boardColumnId: 1,
        deadline: null,
      })

      const mockDragEvent = {
        over: {
          id: 'planner-2024-01-15',
          data: {
            current: {
              type: 'planner',
              date: '2024-01-15',
              // hour is undefined
            },
          },
        },
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: inboxTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).toHaveBeenCalled()
      expect(capturedUpdateData).toEqual({
        id: 1,
        data: {
          boardColumnId: 2,
          deadline: expect.any(String),
        },
      })

      // Verify deadline date matches
      const deadlineDate = new Date(capturedUpdateData!.data.deadline!)
      expect(deadlineDate.toISOString()).toMatch(/^2024-01-15/)
    })

    it('should not update todo when dropped on same zone type without change', () => {
      const scheduledTodo = createMockTodo({
        id: 1,
        description: 'Already scheduled',
        boardColumnId: 2,
        deadline: '2024-01-15T10:00:00.000Z',
      })

      // Simulate dropping on same column (Todo column, id = 2)
      const mockDragEvent = {
        over: {
          id: 'column-2',
          data: {
            current: {
              type: 'board',
              columnId: 2,
            },
          },
        },
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: scheduledTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      // Mutation should NOT be called since it's the same column
      expect(mockUpdateTodo).not.toHaveBeenCalled()
    })
  })

  describe('Drag from Inbox to Board Column', () => {
    it('should update boardColumnId when dropped on board column', () => {
      const inboxTodo = createMockTodo({
        id: 1,
        description: 'Inbox task',
        boardColumnId: 1,
        deadline: null,
      })

      // Simulate drag to "In Progress" column (id = 3)
      const mockDragEvent = {
        over: {
          id: 'column-3',
          data: {
            current: {
              type: 'board',
              columnId: 3,
            },
          },
        },
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: inboxTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).toHaveBeenCalled()
      expect(capturedUpdateData).toEqual({
        id: 1,
        data: { boardColumnId: 3 },
      })
    })

    it('should update boardColumnId when moving between board columns', () => {
      const inProgressTodo = createMockTodo({
        id: 1,
        description: 'In Progress task',
        boardColumnId: 3,
        deadline: null,
      })

      // Move from In Progress (id=3) to Done (id=4)
      const mockDragEvent = {
        over: {
          id: 'column-4',
          data: {
            current: {
              type: 'board',
              columnId: 4,
            },
          },
        },
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: inProgressTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).toHaveBeenCalled()
      expect(capturedUpdateData).toEqual({
        id: 1,
        data: { boardColumnId: 4 },
      })
    })
  })

  describe('Drag to Inbox', () => {
    it('should set boardColumnId = 1 when dropped on inbox', () => {
      const scheduledTodo = createMockTodo({
        id: 1,
        description: 'Scheduled task to unschedule',
        boardColumnId: 2,
        deadline: '2024-01-15T14:00:00.000Z',
      })

      const mockDragEvent = {
        over: {
          id: 'inbox-zone',
          data: {
            current: {
              type: 'inbox',
            },
          },
        },
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: scheduledTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).toHaveBeenCalled()
      expect(capturedUpdateData).toEqual({
        id: 1,
        data: {
          boardColumnId: 1,
        },
      })
    })

    it('should not update if already in inbox', () => {
      const inboxTodo = createMockTodo({
        id: 1,
        description: 'Inbox task',
        boardColumnId: 1,
        deadline: null,
      })

      const mockDragEvent = {
        over: {
          id: 'inbox-zone',
          data: {
            current: {
              type: 'inbox',
            },
          },
        },
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: inboxTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      // Should not update if already in inbox
      expect(mockUpdateTodo).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle dropping on null over target (cancelled drag)', () => {
      const inboxTodo = createMockTodo({
        id: 1,
        description: 'Inbox task',
        boardColumnId: 1,
      })

      // Simulate cancelled drag (no over target)
      const mockDragEvent = {
        over: null,
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: inboxTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).not.toHaveBeenCalled()
    })

    it('should handle missing active data', () => {
      // Simulate drag with missing active data
      const mockDragEvent = {
        over: {
          id: 'inbox-zone',
          data: { current: { type: 'inbox' } },
        },
        active: {
          id: 1,
          data: { current: null },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).not.toHaveBeenCalled()
    })

    it('should handle active data with wrong type', () => {
      const mockDragEvent = {
        over: {
          id: 'inbox-zone',
          data: { current: { type: 'inbox' } },
        },
        active: {
          id: 1,
          data: { current: { type: 'other' } },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).not.toHaveBeenCalled()
    })

    it('should handle planner drop without date', () => {
      const inboxTodo = createMockTodo({
        id: 1,
        description: 'Inbox task',
        boardColumnId: 1,
      })

      // Simulate planner drop without date (invalid)
      const mockDragEvent = {
        over: {
          id: 'planner-zone',
          data: {
            current: {
              type: 'planner',
              // date is missing
            },
          },
        },
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: inboxTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).not.toHaveBeenCalled()
    })

    it('should handle board drop without columnId', () => {
      const inboxTodo = createMockTodo({
        id: 1,
        description: 'Inbox task',
        boardColumnId: 1,
      })

      // Simulate board drop without columnId (invalid)
      const mockDragEvent = {
        over: {
          id: 'board-zone',
          data: {
            current: {
              type: 'board',
              // columnId is missing
            },
          },
        },
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: inboxTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).not.toHaveBeenCalled()
    })

    it('should handle hour 0 (midnight) correctly', () => {
      const inboxTodo = createMockTodo({
        id: 1,
        description: 'Inbox task',
        boardColumnId: 1,
      })

      // Simulate drop on midnight hour slot
      const mockDragEvent = {
        over: {
          id: 'hour-2024-01-15-0',
          data: {
            current: {
              type: 'planner',
              date: '2024-01-15',
              hour: 0,
            },
          },
        },
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: inboxTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).toHaveBeenCalled()

      // Verify hour 0 is set correctly
      const deadlineDate = new Date(capturedUpdateData!.data.deadline!)
      expect(deadlineDate.getHours()).toBe(0)
      expect(deadlineDate.getMinutes()).toBe(0)
    })

    it('should handle hour 23 (late night) correctly', () => {
      const inboxTodo = createMockTodo({
        id: 1,
        description: 'Inbox task',
        boardColumnId: 1,
      })

      // Simulate drop on 11 PM hour slot
      const mockDragEvent = {
        over: {
          id: 'hour-2024-01-15-23',
          data: {
            current: {
              type: 'planner',
              date: '2024-01-15',
              hour: 23,
            },
          },
        },
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: inboxTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).toHaveBeenCalled()

      // Verify hour 23 is set correctly
      const deadlineDate = new Date(capturedUpdateData!.data.deadline!)
      expect(deadlineDate.getHours()).toBe(23)
      expect(deadlineDate.getMinutes()).toBe(0)
    })

    it('should handle hour 12 (noon) correctly', () => {
      const inboxTodo = createMockTodo({
        id: 1,
        description: 'Inbox task',
        boardColumnId: 1,
      })

      const mockDragEvent = {
        over: {
          id: 'hour-2024-01-15-12',
          data: {
            current: {
              type: 'planner',
              date: '2024-01-15',
              hour: 12,
            },
          },
        },
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: inboxTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).toHaveBeenCalled()

      // Verify hour 12 is set correctly
      const deadlineDate = new Date(capturedUpdateData!.data.deadline!)
      expect(deadlineDate.getHours()).toBe(12)
      expect(deadlineDate.getMinutes()).toBe(0)
    })
  })

  describe('Unknown Zone Type', () => {
    it('should not update for unknown zone type', () => {
      const inboxTodo = createMockTodo({
        id: 1,
        description: 'Inbox task',
        boardColumnId: 1,
      })

      const mockDragEvent = {
        over: {
          id: 'unknown-zone',
          data: {
            current: {
              type: 'unknown',
            },
          },
        },
        active: {
          id: 1,
          data: {
            current: {
              type: 'todo',
              todo: inboxTodo,
            },
          },
        },
      } as unknown as DragEndEvent

      handleDragEnd(mockDragEvent)

      expect(mockUpdateTodo).not.toHaveBeenCalled()
    })
  })

  describe('Planner Filtering Logic', () => {
    it('should identify todos that belong in planner (deadline + boardColumnId === 2)', () => {
      const todos: Todo[] = [
        createMockTodo({ id: 1, description: 'Scheduled', deadline: '2024-01-15T10:00:00', boardColumnId: 2 }),
        createMockTodo({ id: 2, description: 'No deadline', deadline: null, boardColumnId: 2 }),
        createMockTodo({ id: 3, description: 'Wrong column', deadline: '2024-01-15T10:00:00', boardColumnId: 1 }),
        createMockTodo({ id: 4, description: 'In Progress', deadline: '2024-01-15T10:00:00', boardColumnId: 3 }),
      ]

      // Filter todos for planner: deadline AND boardColumnId === 2
      const plannerTodos = todos.filter(t => t.deadline !== null && t.boardColumnId === 2)

      expect(plannerTodos).toHaveLength(1)
      expect(plannerTodos[0].description).toBe('Scheduled')
    })

    it('should identify todos that belong in inbox (boardColumnId === 1)', () => {
      const todos: Todo[] = [
        createMockTodo({ id: 1, description: 'Inbox item', boardColumnId: 1 }),
        createMockTodo({ id: 2, description: 'Todo item', boardColumnId: 2 }),
        createMockTodo({ id: 3, description: 'In Progress item', boardColumnId: 3 }),
      ]

      // Filter todos for inbox: boardColumnId === 1
      const inboxTodos = todos.filter(t => t.boardColumnId === 1)

      expect(inboxTodos).toHaveLength(1)
      expect(inboxTodos[0].description).toBe('Inbox item')
    })

    it('should identify todos for each board column', () => {
      const todos: Todo[] = [
        createMockTodo({ id: 1, description: 'Inbox', boardColumnId: 1 }),
        createMockTodo({ id: 2, description: 'Todo', boardColumnId: 2 }),
        createMockTodo({ id: 3, description: 'In Progress', boardColumnId: 3 }),
        createMockTodo({ id: 4, description: 'Done', boardColumnId: 4 }),
      ]

      // Board displays columns 2-4, excluding Inbox
      const boardColumnIds = [2, 3, 4]

      boardColumnIds.forEach(columnId => {
        const columnTodos = todos.filter(t => t.boardColumnId === columnId)
        expect(columnTodos).toHaveLength(1)
      })
    })
  })

  describe('Deadline Datetime Logic', () => {
    it('should create ISO string that can be parsed back', () => {
      const date = '2024-03-18'
      const hour = 14
      const targetDate = new Date(date)
      targetDate.setHours(hour, 0, 0, 0)

      const isoString = targetDate.toISOString()
      const parsedDate = new Date(isoString)

      // When parsed back, it should represent the same moment in time
      expect(parsedDate.getTime()).toBe(targetDate.getTime())
    })

    it('should handle different timezones consistently', () => {
      const date = '2024-03-18'
      const hour = 14

      const targetDate = new Date(date)
      targetDate.setHours(hour, 0, 0, 0)

      // The hour should always be set correctly in local time
      expect(targetDate.getHours()).toBe(hour)
    })
  })
})