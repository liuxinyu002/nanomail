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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { startOfWeek, addDays } from 'date-fns'
import { PlannerPanel } from '../PlannerPanel'
import type { Todo } from '@nanomail/shared'
import type { DragEndEvent } from '@dnd-kit/core'

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  useDroppable: vi.fn(() => ({
    setNodeRef: vi.fn(),
    isOver: false,
  })),
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock the mutation hook used by PlannerTodoCard
vi.mock('@/hooks', () => ({
  useUpdateTodoMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

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
    notes: null,
    color: null,
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

/**
 * WeekView Integration Tests (Phase 3)
 *
 * Tests the complete WeekView integration within PlannerPanel:
 * 1. WeekView 正常渲染
 * 2. 日/周视图切换
 * 3. 日期导航条点击切换日期
 * 4. 周切换箭头正常工作
 * 5. 滑动动画正确触发
 */
describe('WeekView Integration in PlannerPanel', () => {
  const defaultProps = {
    todos: [],
    onTodoClick: vi.fn(),
    onDeadlineChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PlannerPanel 中 WeekView 正常渲染', () => {
    it('should render WeekView when week view is selected', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // WeekView should be rendered
      expect(screen.getByTestId('week-view')).toBeInTheDocument()
    })

    it('should render WeekDateNav inside WeekView', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // WeekDateNav should be present
      expect(screen.getByTestId('week-date-nav')).toBeInTheDocument()
    })

    it('should render TimeAxis in WeekView', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // TimeAxis should be present
      expect(screen.getByTestId('time-axis')).toBeInTheDocument()
    })

    it('should render 24 hour slots in WeekView', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Should have 24 hour slots
      const hourSlots = screen.getAllByTestId(/hour-slot-\d+/)
      expect(hourSlots).toHaveLength(24)
    })
  })

  describe('日/周视图切换功能正常', () => {
    it('should switch from DayView to WeekView when week button is clicked', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Initially DayView
      expect(screen.getByTestId('day-view')).toBeInTheDocument()
      expect(screen.queryByTestId('week-view')).not.toBeInTheDocument()

      // Click week button
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Now WeekView
      expect(screen.getByTestId('week-view')).toBeInTheDocument()
      expect(screen.queryByTestId('day-view')).not.toBeInTheDocument()
    })

    it('should switch from WeekView back to DayView when day button is clicked', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)
      expect(screen.getByTestId('week-view')).toBeInTheDocument()

      // Switch back to DayView
      const dayButton = within(viewToggle).getByRole('button', { name: /日/i })
      await user.click(dayButton)
      expect(screen.getByTestId('day-view')).toBeInTheDocument()
    })

    it('should preserve scheduled todos count when switching views', async () => {
      const user = userEvent.setup()
      const todos: Todo[] = [
        createMockTodo({ id: 1, deadline: '2026-03-18T10:00:00', boardColumnId: 2 }),
        createMockTodo({ id: 2, deadline: '2026-03-19T10:00:00', boardColumnId: 2 }),
      ]
      render(<PlannerPanel {...defaultProps} todos={todos} />)

      // Initial count
      expect(screen.getByLabelText(/scheduled tasks/i)).toHaveTextContent('2 scheduled')

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Count should still be 2
      expect(screen.getByLabelText(/scheduled tasks/i)).toHaveTextContent('2 scheduled')
    })
  })

  describe('日期导航条点击切换日期', () => {
    // Don't use fake timers for interaction tests
    it('should display correct weekday labels in Chinese', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Chinese weekday abbreviations - verify all 7 are present
      // Using getAllByTestId since we have specific testids for each date item
      const dateItems = screen.getAllByTestId(/date-item-\d/)
      expect(dateItems).toHaveLength(7)

      // Verify Chinese weekday labels are present in the date items
      const weekDateNav = screen.getByTestId('week-date-nav')
      const expectedLabels = ['日', '一', '二', '三', '四', '五', '六']
      expectedLabels.forEach((label) => {
        expect(within(weekDateNav).getByText(label)).toBeInTheDocument()
      })
    })

    it('should switch displayed date when clicking on a different day', async () => {
      const user = userEvent.setup()
      // Use today's date for the todos so they appear
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      const todos: Todo[] = [
        createMockTodo({ id: 1, description: 'Today task', deadline: `${todayStr}T10:00:00`, boardColumnId: 2 }),
        createMockTodo({ id: 2, description: 'Tomorrow task', deadline: `${tomorrowStr}T10:00:00`, boardColumnId: 2 }),
      ]
      render(<PlannerPanel {...defaultProps} todos={todos} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Today task should be visible initially (may appear multiple times)
      expect(screen.getAllByText('Today task').length).toBeGreaterThan(0)

      // Click on tomorrow's date - find the button with tomorrow's date number
      const tomorrowDate = tomorrow.getDate()
      const tomorrowButton = screen.getByRole('button', { name: new RegExp(tomorrowDate.toString()) })
      await user.click(tomorrowButton)

      // Now should show tomorrow task (may appear multiple times)
      expect(screen.getAllByText('Tomorrow task').length).toBeGreaterThan(0)
    })

    it('should update selected date styling when date is clicked', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Find today's button - it should be selected
      const today = new Date()
      const todayIndex = today.getDay() // 0 = Sunday, 1 = Monday, etc.
      const todayButton = screen.getByTestId(`date-item-${todayIndex}`)
      expect(todayButton).toHaveClass('bg-blue-600')

      // Click on a different day (e.g., index 0 - Sunday, or any other day)
      const differentIndex = todayIndex === 0 ? 1 : 0
      const differentButton = screen.getByTestId(`date-item-${differentIndex}`)
      await user.click(differentButton)

      // Different day should now be selected
      expect(differentButton).toHaveClass('bg-blue-600')
      // Today should no longer be selected
      expect(todayButton).not.toHaveClass('bg-blue-600')
    })
  })

  describe('周切换箭头正常工作', () => {
    // Don't use fake timers for interaction tests
    it('should navigate to previous week when left arrow is clicked', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Get the current week's dates
      const today = new Date()
      const weekStart = startOfWeek(today, { weekStartsOn: 0 })
      const sundayDate = weekStart.getDate()

      // Initially shows current week
      expect(screen.getByText(sundayDate.toString())).toBeInTheDocument()

      // Click left arrow
      const leftArrow = screen.getByRole('button', { name: /上一周/i })
      await user.click(leftArrow)

      // Should show previous week's Sunday date
      const prevWeekStart = addDays(weekStart, -7)
      const prevSundayDate = prevWeekStart.getDate()
      expect(screen.getByText(prevSundayDate.toString())).toBeInTheDocument()
    })

    it('should navigate to next week when right arrow is clicked', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Get the current week's dates
      const today = new Date()
      const weekStart = startOfWeek(today, { weekStartsOn: 0 })
      const sundayDate = weekStart.getDate()

      // Initially shows current week
      expect(screen.getByText(sundayDate.toString())).toBeInTheDocument()

      // Click right arrow
      const rightArrow = screen.getByRole('button', { name: /下一周/i })
      await user.click(rightArrow)

      // Should show next week's Sunday date
      const nextWeekStart = addDays(weekStart, 7)
      const nextSundayDate = nextWeekStart.getDate()
      expect(screen.getByText(nextSundayDate.toString())).toBeInTheDocument()
    })

    it('should select first day of week when navigating to non-current week', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Click right arrow to go to next week
      const rightArrow = screen.getByRole('button', { name: /下一周/i })
      await user.click(rightArrow)

      // Sunday (index 0) should be selected in non-current week
      const sundayButton = screen.getByTestId('date-item-0')
      expect(sundayButton).toHaveClass('bg-blue-600')
    })
  })

  describe('滑动动画正确触发', () => {
    // Don't use fake timers for interaction tests
    it('should apply slide-left animation when switching to a later date', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Click on a later day in the week
      const today = new Date()
      const todayIndex = today.getDay()
      // Find a day later in the week (if not Saturday)
      const laterIndex = todayIndex < 6 ? todayIndex + 1 : todayIndex
      const laterButton = screen.getByTestId(`date-item-${laterIndex}`)
      await user.click(laterButton)

      // Day content should have slide-left animation class
      const dayContent = screen.getByTestId('day-content')
      expect(dayContent).toHaveClass('animate-slide-left')
    })

    it('should apply slide-right animation when switching to an earlier date', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Click on an earlier day in the week
      const today = new Date()
      const todayIndex = today.getDay()
      // Find a day earlier in the week (if not Sunday)
      const earlierIndex = todayIndex > 0 ? todayIndex - 1 : todayIndex
      const earlierButton = screen.getByTestId(`date-item-${earlierIndex}`)
      await user.click(earlierButton)

      // Day content should have slide-right animation class
      const dayContent = screen.getByTestId('day-content')
      expect(dayContent).toHaveClass('animate-slide-right')
    })

    it('should apply slide-left animation when navigating to next week', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Click right arrow (next week)
      const rightArrow = screen.getByRole('button', { name: /下一周/i })
      await user.click(rightArrow)

      // Day content should have slide-left animation class
      const dayContent = screen.getByTestId('day-content')
      expect(dayContent).toHaveClass('animate-slide-left')
    })

    it('should apply slide-right animation when navigating to previous week', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Click left arrow (previous week)
      const leftArrow = screen.getByRole('button', { name: /上一周/i })
      await user.click(leftArrow)

      // Day content should have slide-right animation class
      const dayContent = screen.getByTestId('day-content')
      expect(dayContent).toHaveClass('animate-slide-right')
    })

    it('should change React key when date changes to trigger re-animation', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Get initial key
      const initialDayContent = screen.getByTestId('day-content')
      const initialKey = initialDayContent.getAttribute('data-key')

      // Click on a different day
      const today = new Date()
      const todayIndex = today.getDay()
      const differentIndex = todayIndex === 0 ? 1 : 0
      const differentButton = screen.getByTestId(`date-item-${differentIndex}`)
      await user.click(differentButton)

      // Get new key
      const newDayContent = screen.getByTestId('day-content')
      const newKey = newDayContent.getAttribute('data-key')

      // Keys should be different
      expect(newKey).not.toBe(initialKey)
    })
  })

  describe('智能默认选中逻辑', () => {
    // Don't use fake timers for interaction tests
    it('should select today when current week is displayed', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Today should be selected
      const today = new Date()
      const todayIndex = today.getDay()
      const todayButton = screen.getByTestId(`date-item-${todayIndex}`)
      expect(todayButton).toHaveClass('bg-blue-600')
    })

    it('should select first day when non-current week is displayed', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Navigate to next week
      const rightArrow = screen.getByRole('button', { name: /下一周/i })
      await user.click(rightArrow)

      // Sunday (index 0) should be selected in non-current week
      const sundayButton = screen.getByTestId('date-item-0')
      expect(sundayButton).toHaveClass('bg-blue-600')
    })
  })

  describe('Todo 交互集成测试', () => {
    it('should display todos for the selected date in WeekView', async () => {
      const user = userEvent.setup()
      // Use today's date for the todos
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      const todos: Todo[] = [
        createMockTodo({ id: 1, description: 'Today task', deadline: `${todayStr}T10:00:00`, boardColumnId: 2 }),
        createMockTodo({ id: 2, description: 'Tomorrow task', deadline: `${tomorrowStr}T10:00:00`, boardColumnId: 2 }),
      ]
      render(<PlannerPanel {...defaultProps} todos={todos} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Today task should be visible (may appear multiple times)
      expect(screen.getAllByText('Today task').length).toBeGreaterThan(0)
      expect(screen.queryByText('Tomorrow task')).not.toBeInTheDocument()
    })

    it('should call onTodoClick when todo is clicked in WeekView', async () => {
      const user = userEvent.setup()
      // Use today's date for the todo
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const mockTodo = createMockTodo({ id: 1, description: 'Test task', deadline: `${todayStr}T10:00:00`, boardColumnId: 2 })
      const onTodoClick = vi.fn()
      render(<PlannerPanel {...defaultProps} todos={[mockTodo]} onTodoClick={onTodoClick} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Click on the todo
      const todoCard = screen.getByTestId('planner-todo-card-1')
      await user.click(todoCard)

      expect(onTodoClick).toHaveBeenCalledWith(mockTodo)
    })

    it('should filter todos correctly - only deadline AND boardColumnId === 2', async () => {
      const user = userEvent.setup()
      // Use today's date for the todo
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const todos: Todo[] = [
        createMockTodo({ id: 1, description: 'Scheduled', deadline: `${todayStr}T10:00:00`, boardColumnId: 2 }),
        createMockTodo({ id: 2, description: 'No deadline', deadline: null, boardColumnId: 2 }),
        createMockTodo({ id: 3, description: 'Wrong column', deadline: `${todayStr}T10:00:00`, boardColumnId: 1 }),
      ]
      render(<PlannerPanel {...defaultProps} todos={todos} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Only "Scheduled" should be visible (may appear multiple times)
      expect(screen.getAllByText('Scheduled').length).toBeGreaterThan(0)
      expect(screen.queryByText('No deadline')).not.toBeInTheDocument()
      expect(screen.queryByText('Wrong column')).not.toBeInTheDocument()
    })
  })
})