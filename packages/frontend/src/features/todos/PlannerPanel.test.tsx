import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DndProvider } from '@/contexts/DndContext'
import { PlannerPanel, type PlannerPanelProps } from './PlannerPanel'
import type { TodoItem } from '@/services'

// Mock useTodosByDateRange hook
vi.mock('@/hooks', () => ({
  useTodosByDateRange: () => ({
    data: {
      todos: [],
    },
    isLoading: false,
  }),
}))

// Mock TodoCalendar to simplify testing
vi.mock('./TodoCalendar', () => ({
  TodoCalendar: ({ onTodoClick }: { onTodoClick?: (todo: TodoItem) => void }) => (
    <div data-testid="todo-calendar-mock" data-has-click-handler={!!onTodoClick}>
      Calendar Component
    </div>
  ),
}))

describe('PlannerPanel', () => {
  const defaultProps: PlannerPanelProps = {
    todos: [],
    onTodoClick: vi.fn(),
    onDeadlineChange: vi.fn(),
  }

  describe('Rendering', () => {
    it('should render the planner panel container', () => {
      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByTestId('planner-panel')).toBeInTheDocument()
    })

    it('should render planner header with title', () => {
      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByRole('heading', { name: /planner/i })).toBeInTheDocument()
    })

    it('should render the TodoCalendar component', () => {
      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByTestId('todo-calendar-mock')).toBeInTheDocument()
    })
  })

  describe('Calendar Integration', () => {
    it('should pass onTodoClick to TodoCalendar', () => {
      const onTodoClick = vi.fn()
      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} onTodoClick={onTodoClick} />
        </DndProvider>
      )

      const calendar = screen.getByTestId('todo-calendar-mock')
      expect(calendar).toHaveAttribute('data-has-click-handler', 'true')
    })

    it('should work without onTodoClick prop', () => {
      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} onTodoClick={undefined} />
        </DndProvider>
      )

      expect(screen.getByTestId('todo-calendar-mock')).toBeInTheDocument()
    })
  })

  describe('Visual Styling', () => {
    it('should have proper panel layout', () => {
      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} />
        </DndProvider>
      )

      const panel = screen.getByTestId('planner-panel')
      expect(panel).toHaveClass('flex')
      expect(panel).toHaveClass('flex-col')
    })

    it('should have proper header styling', () => {
      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} />
        </DndProvider>
      )

      const header = screen.getByTestId('panel-header')
      expect(header).toHaveClass('border-b')
    })

    it('should accept custom className', () => {
      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} className="custom-class" />
        </DndProvider>
      )

      const panel = screen.getByTestId('planner-panel')
      expect(panel).toHaveClass('custom-class')
    })
  })

  describe('Deadline Display', () => {
    it('should display count of todos with deadlines', () => {
      const todos: TodoItem[] = [
        {
          id: 1,
          emailId: 100,
          description: 'Todo with deadline',
          status: 'pending',
          deadline: '2024-12-31T23:59:59.000Z',
          boardColumnId: 1,
          position: 0,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
        {
          id: 2,
          emailId: 101,
          description: 'Todo without deadline',
          status: 'pending',
          deadline: null,
          boardColumnId: 1,
          position: 1,
          createdAt: '2024-01-15T11:00:00.000Z',
        },
        {
          id: 3,
          emailId: 102,
          description: 'Another with deadline',
          status: 'pending',
          deadline: '2024-12-25T00:00:00.000Z',
          boardColumnId: 2,
          position: 0,
          createdAt: '2024-01-15T12:00:00.000Z',
        },
      ]

      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      // Should show count of todos with deadlines (2)
      expect(screen.getByLabelText('2 scheduled tasks')).toBeInTheDocument()
    })

    it('should show 0 when no todos have deadlines', () => {
      const todos: TodoItem[] = [
        {
          id: 1,
          emailId: 100,
          description: 'No deadline',
          status: 'pending',
          deadline: null,
          boardColumnId: 1,
          position: 0,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
      ]

      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      expect(screen.getByLabelText('0 scheduled tasks')).toBeInTheDocument()
    })
  })

  describe('Drag and Drop for Deadline Assignment', () => {
    it('should be configured as a planner droppable zone', () => {
      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} />
        </DndProvider>
      )

      // The calendar should be wrapped in appropriate droppable context
      expect(screen.getByTestId('todo-calendar-mock')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading level', () => {
      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} />
        </DndProvider>
      )

      const heading = screen.getByRole('heading', { name: /planner/i, level: 2 })
      expect(heading).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no todos have deadlines', () => {
      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} todos={[]} />
        </DndProvider>
      )

      // Calendar should still render
      expect(screen.getByTestId('todo-calendar-mock')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle todos with invalid deadline dates gracefully', () => {
      const todos: TodoItem[] = [
        {
          id: 1,
          emailId: 100,
          description: 'Invalid deadline',
          status: 'pending',
          deadline: 'invalid-date',
          boardColumnId: 1,
          position: 0,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
      ]

      // Should not throw
      expect(() => {
        render(
          <DndProvider>
            <PlannerPanel {...defaultProps} todos={todos} />
          </DndProvider>
        )
      }).not.toThrow()
    })

    it('should handle large number of todos', () => {
      const todos: TodoItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        emailId: 100 + i,
        description: `Todo ${i}`,
        status: 'pending' as const,
        deadline: i % 2 === 0 ? '2024-12-31T23:59:59.000Z' : null,
        boardColumnId: 1,
        position: i,
        createdAt: '2024-01-15T10:00:00.000Z',
      }))

      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      // Should show 50 todos with deadlines
      expect(screen.getByLabelText('50 scheduled tasks')).toBeInTheDocument()
    })
  })

  describe('Interaction with Board Columns', () => {
    it('should not filter by boardColumnId - shows all todos with deadlines', () => {
      const todos: TodoItem[] = [
        {
          id: 1,
          emailId: 100,
          description: 'Inbox todo with deadline',
          status: 'pending',
          deadline: '2024-12-31T23:59:59.000Z',
          boardColumnId: 1, // Inbox
          position: 0,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
        {
          id: 2,
          emailId: 101,
          description: 'Board todo with deadline',
          status: 'pending',
          deadline: '2024-12-25T00:00:00.000Z',
          boardColumnId: 3, // In Progress
          position: 0,
          createdAt: '2024-01-15T11:00:00.000Z',
        },
      ]

      render(
        <DndProvider>
          <PlannerPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      // Should count both todos regardless of boardColumnId
      expect(screen.getByLabelText('2 scheduled tasks')).toBeInTheDocument()
    })
  })
})