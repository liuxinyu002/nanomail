import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlannerPanel, type PlannerPanelProps } from './PlannerPanel'
import type { Todo } from '@nanomail/shared'

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

describe('PlannerPanel', () => {
  // Mock current date for consistent tests
  const mockCurrentDate = new Date(2024, 0, 15) // January 15, 2024

  const defaultProps: PlannerPanelProps = {
    todos: [],
    onTodoClick: vi.fn(),
  }

  describe('rendering', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(mockCurrentDate)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('renders the panel with header', () => {
      render(<PlannerPanel {...defaultProps} />)

      expect(screen.getByTestId('planner-panel')).toBeInTheDocument()
      expect(screen.getByTestId('panel-header')).toBeInTheDocument()
    })

    it('renders the PlannerViewToggle in header', () => {
      render(<PlannerPanel {...defaultProps} />)

      expect(screen.getByTestId('planner-view-toggle')).toBeInTheDocument()
    })

    it('renders DayView by default', () => {
      render(<PlannerPanel {...defaultProps} />)

      expect(screen.getByTestId('day-view')).toBeInTheDocument()
      expect(screen.queryByTestId('week-view')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<PlannerPanel {...defaultProps} className="custom-class" />)

      const panel = screen.getByTestId('planner-panel')
      expect(panel).toHaveClass('custom-class')
    })

    it('should have proper panel layout', () => {
      render(<PlannerPanel {...defaultProps} />)

      const panel = screen.getByTestId('planner-panel')
      expect(panel).toHaveClass('flex')
      expect(panel).toHaveClass('flex-col')
    })

    it('should have proper header styling', () => {
      render(<PlannerPanel {...defaultProps} />)

      const header = screen.getByTestId('panel-header')
      expect(header).toHaveClass('border-b')
    })
  })

  describe('todo filtering', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(mockCurrentDate)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shows count of scheduled todos (todos with deadline)', () => {
      const todos: Todo[] = [
        createMockTodo({ id: 1, description: 'Scheduled todo', deadline: '2024-01-15T10:00:00', boardColumnId: 2 }),
        createMockTodo({ id: 2, description: 'Another scheduled', deadline: '2024-01-16T10:00:00', boardColumnId: 1 }),
        createMockTodo({ id: 3, description: 'No deadline', deadline: null, boardColumnId: 2 }),
      ]
      render(<PlannerPanel {...defaultProps} todos={todos} />)

      // 2 todos have deadline
      const countElement = screen.getByLabelText(/scheduled tasks/i)
      expect(countElement).toHaveTextContent('2 scheduled')
    })

    it('filters todos to only show those with deadline in DayView', () => {
      const todos: Todo[] = [
        createMockTodo({ id: 1, description: 'Scheduled todo', deadline: '2024-01-15T10:00:00', boardColumnId: 2 }),
        createMockTodo({ id: 2, description: 'No deadline', deadline: null, boardColumnId: 2 }),
        createMockTodo({ id: 3, description: 'Inbox task', deadline: '2024-01-15T10:00:00', boardColumnId: 1 }),
        createMockTodo({ id: 4, description: 'In progress', deadline: '2024-01-15T10:00:00', boardColumnId: 3 }),
      ]
      render(<PlannerPanel {...defaultProps} todos={todos} />)

      // Only todos with deadline should be visible in the DayView
      // Use test id to get the planner card specifically
      expect(screen.getByTestId('planner-todo-card-1')).toBeInTheDocument()
      expect(screen.queryByTestId('planner-todo-card-2')).not.toBeInTheDocument()
      expect(screen.getByTestId('planner-todo-card-3')).toBeInTheDocument()
      expect(screen.getByTestId('planner-todo-card-4')).toBeInTheDocument()
    })

    it('shows "0 scheduled" when no matching todos', () => {
      const todos: Todo[] = [
        createMockTodo({ id: 1, description: 'No deadline', deadline: null, boardColumnId: 2 }),
      ]
      render(<PlannerPanel {...defaultProps} todos={todos} />)

      const countElement = screen.getByLabelText(/scheduled tasks/i)
      expect(countElement).toHaveTextContent('0 scheduled')
    })
  })

  describe('view switching', () => {
    // Don't use fake timers for interaction tests
    it('switches to WeekView when week button is clicked', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Initially DayView
      expect(screen.getByTestId('day-view')).toBeInTheDocument()

      // Click week button in the view toggle (not WeekDateNav)
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Should now show WeekView
      expect(screen.getByTestId('week-view')).toBeInTheDocument()
      expect(screen.queryByTestId('day-view')).not.toBeInTheDocument()
    })

    it('switches back to DayView when day button is clicked', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)
      expect(screen.getByTestId('week-view')).toBeInTheDocument()

      // Switch back to DayView - click the day button in view toggle
      const dayButton = within(viewToggle).getByRole('button', { name: /日/i })
      await user.click(dayButton)
      expect(screen.getByTestId('day-view')).toBeInTheDocument()
    })

    it('preserves todo count when switching views', async () => {
      const user = userEvent.setup()
      const todos: Todo[] = [
        createMockTodo({ id: 1, description: 'Scheduled todo', deadline: '2024-01-15T10:00:00', boardColumnId: 2 }),
        createMockTodo({ id: 2, description: 'Another scheduled', deadline: '2024-01-16T10:00:00', boardColumnId: 2 }),
      ]
      render(<PlannerPanel {...defaultProps} todos={todos} />)

      // Initial count
      const countElement = screen.getByLabelText(/scheduled tasks/i)
      expect(countElement).toHaveTextContent('2 scheduled')

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // Count should still be 2
      expect(screen.getByLabelText(/scheduled tasks/i)).toHaveTextContent('2 scheduled')
    })
  })

  describe('current date handling', () => {
    it('passes current date to DayView', () => {
      const todos: Todo[] = []
      render(<PlannerPanel {...defaultProps} todos={todos} />)

      // DayView should be rendered with today's date
      const dayView = screen.getByTestId('day-view')
      expect(dayView).toBeInTheDocument()
    })

    it('passes week start (Sunday) to WeekView', async () => {
      const user = userEvent.setup()
      render(<PlannerPanel {...defaultProps} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // WeekView should be rendered
      const weekView = screen.getByTestId('week-view')
      expect(weekView).toBeInTheDocument()

      // WeekDateNav should be present
      const weekDateNav = screen.getByTestId('week-date-nav')
      expect(weekDateNav).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('opens popover when a todo card is clicked in DayView (not onTodoClick callback)', async () => {
      const user = userEvent.setup()
      // Note: DayView shows today's content. Create todo with today's deadline.
      // This test focuses on click interaction, not date handling.
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const mockTodo = createMockTodo({
        id: 1,
        description: 'Clickable todo',
        deadline: `${todayStr}T10:00:00`,
        boardColumnId: 2,
      })
      const onTodoClick = vi.fn()
      render(<PlannerPanel {...defaultProps} todos={[mockTodo]} onTodoClick={onTodoClick} />)

      // Popover should not be visible initially
      expect(screen.queryByTestId('todo-detail-popover')).not.toBeInTheDocument()

      const todoCard = screen.getByTestId('planner-todo-card-1')
      await user.click(todoCard)

      // Popover should now be visible (new behavior)
      expect(screen.getByTestId('todo-detail-popover')).toBeInTheDocument()
      // onTodoClick is no longer called - popover opens instead
      expect(onTodoClick).not.toHaveBeenCalled()
    })

    it('opens popover when a todo card is clicked in WeekView (not onTodoClick callback)', async () => {
      const user = userEvent.setup()
      // Note: WeekView defaults to showing today. Create todo with today's deadline.
      // This test focuses on click interaction, not date handling.
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const mockTodo = createMockTodo({
        id: 1,
        description: 'Clickable todo',
        deadline: `${todayStr}T10:00:00`,
        boardColumnId: 2,
      })
      const onTodoClick = vi.fn()
      render(<PlannerPanel {...defaultProps} todos={[mockTodo]} onTodoClick={onTodoClick} />)

      // Switch to WeekView
      const viewToggle = screen.getByTestId('planner-view-toggle')
      const weekButton = within(viewToggle).getByRole('button', { name: /周/i })
      await user.click(weekButton)

      // The todo should be visible since WeekView shows today by default
      // Popover should not be visible initially
      expect(screen.queryByTestId('todo-detail-popover')).not.toBeInTheDocument()

      const todoCard = screen.getByTestId('planner-todo-card-1')
      await user.click(todoCard)

      // Popover should now be visible (new behavior)
      expect(screen.getByTestId('todo-detail-popover')).toBeInTheDocument()
      // onTodoClick is no longer called - popover opens instead
      expect(onTodoClick).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('handles empty todos array', () => {
      const todos: Todo[] = []
      render(<PlannerPanel {...defaultProps} todos={todos} />)

      expect(screen.getByTestId('planner-panel')).toBeInTheDocument()
      expect(screen.getByLabelText(/scheduled tasks/i)).toHaveTextContent('0 scheduled')
    })

    it('handles todos with null deadline', () => {
      const todos: Todo[] = [
        createMockTodo({ id: 1, description: 'Null deadline', deadline: null, boardColumnId: 2 }),
      ]
      render(<PlannerPanel {...defaultProps} todos={todos} />)

      // Should not show in the scheduler
      expect(screen.queryByText('Null deadline')).not.toBeInTheDocument()
    })

    it('handles large number of todos', () => {
      const todos: Todo[] = Array.from({ length: 100 }, (_, i) =>
        createMockTodo({
          id: i + 1,
          description: `Todo ${i + 1}`,
          deadline: `2024-01-15T${String(i % 24).padStart(2, '0')}:00:00`,
          boardColumnId: 2,
        })
      )
      render(<PlannerPanel {...defaultProps} todos={todos} />)

      expect(screen.getByLabelText(/scheduled tasks/i)).toHaveTextContent('100 scheduled')
    })
  })

  describe('type consistency', () => {
    it('uses Todo type from @nanomail/shared', () => {
      // This test verifies that the component accepts Todo[] as props
      const todos: Todo[] = [
        {
          id: 1,
          emailId: 100,
          description: 'Test',
          status: 'pending',
          deadline: '2024-01-15T10:00:00',
          boardColumnId: 2,
          position: 0,
          notes: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
      ]
      // TypeScript will error if types don't match
      render(<PlannerPanel {...defaultProps} todos={todos} />)

      expect(screen.getByTestId('planner-panel')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for scheduled count', () => {
      render(<PlannerPanel {...defaultProps} />)

      const countElement = screen.getByLabelText(/scheduled tasks/i)
      expect(countElement).toBeInTheDocument()
    })
  })
})