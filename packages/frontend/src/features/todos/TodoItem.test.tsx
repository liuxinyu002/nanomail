import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { TodoItem, type TodoItemProps } from './TodoItem'
import type { TodoItem as TodoItemType } from '@/services'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock mutation hooks
const mockUpdateMutate = vi.fn()
const mockDeleteMutate = vi.fn()

vi.mock('@/hooks', () => ({
  useUpdateTodoMutation: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteTodoMutation: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}))

// Helper to render with router
function renderWithRouter(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  )
}

describe('TodoItem', () => {
  const mockTodo: TodoItemType = {
    id: 1,
    emailId: 100,
    description: 'Review the quarterly report',
    status: 'pending',
    deadline: null,
    boardColumnId: 2, // Todo column
    createdAt: '2024-01-15T10:00:00.000Z',
  }

  const defaultProps: TodoItemProps = {
    todo: mockTodo,
  }

  beforeEach(() => {
    mockUpdateMutate.mockReset()
    mockDeleteMutate.mockReset()
    mockNavigate.mockReset()
  })

  describe('TodoCard Integration', () => {
    it('should render TodoCard component', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      // TodoCard has data-testid="todo-card"
      expect(screen.getByTestId('todo-card')).toBeInTheDocument()
    })

    it('should render todo description', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      expect(screen.getByText('Review the quarterly report')).toBeInTheDocument()
    })

    it('should have white background', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('bg-white')
    })

    it('should have soft shadow', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]')
    })

    it('should NOT have column-based border colors (Phase 7 migration)', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const card = screen.getByTestId('todo-card')
      // Should NOT have column-based left border
      expect(card).not.toHaveClass('border-l-blue-500')
      expect(card).not.toHaveClass('border-l-red-500')
      expect(card).not.toHaveClass('border-l-amber-500')
      expect(card).not.toHaveClass('border-l-green-500')
      // Should NOT have border-l-4 class
      expect(card).not.toHaveClass('border-l-4')
    })
  })

  describe('Checkbox Behavior', () => {
    it('should render unchecked checkbox for pending todo', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('should render checked checkbox for completed todo', () => {
      const completedTodo = { ...mockTodo, status: 'completed' as const }
      renderWithRouter(<TodoItem {...defaultProps} todo={completedTodo} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should call updateMutation.mutate when checkbox is clicked', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      await userEvent.click(checkbox)

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: 1,
        data: { status: 'completed' },
      })
    })

    it('should toggle from completed to pending', async () => {
      const completedTodo = { ...mockTodo, status: 'completed' as const }

      renderWithRouter(<TodoItem {...defaultProps} todo={completedTodo} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()

      await userEvent.click(checkbox)

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: 1,
        data: { status: 'pending' },
      })
    })
  })

  describe('Title Display', () => {
    it('should show line-through style for completed todo', () => {
      const completedTodo = { ...mockTodo, status: 'completed' as const }
      renderWithRouter(<TodoItem {...defaultProps} todo={completedTodo} />)

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('line-through')
    })

    it('should have primary text color', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('text-[#111827]')
    })

    it('should have font-medium class', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('font-medium')
    })

    it('should have line-clamp-2 by default (not expanded)', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('line-clamp-2')
    })
  })

  describe('Email Link', () => {
    it('should render email link icon when todo has emailId', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      // EmailLinkIcon renders a link with aria-label
      const emailLink = screen.getByRole('link', { name: /view associated email/i })
      expect(emailLink).toBeInTheDocument()
    })

    it('should link to the source email using /inbox/ route', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const emailLink = screen.getByRole('link', { name: /view associated email/i })
      expect(emailLink).toHaveAttribute('href', '/inbox/100')
    })

    it('should link with correct emailId from todo', () => {
      const customTodo = { ...mockTodo, emailId: 456 }
      renderWithRouter(<TodoItem {...defaultProps} todo={customTodo} />)

      const emailLink = screen.getByRole('link', { name: /view associated email/i })
      expect(emailLink).toHaveAttribute('href', '/inbox/456')
    })
  })

  describe('Deadline Display', () => {
    it('should render deadline chip when todo has deadline', () => {
      const todoWithDeadline = { ...mockTodo, deadline: '2024-12-31T23:59:59.000Z' }
      renderWithRouter(<TodoItem {...defaultProps} todo={todoWithDeadline} />)

      expect(screen.getByTestId('deadline-chip')).toBeInTheDocument()
    })

    it('should not render deadline chip when todo has no deadline', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      expect(screen.queryByTestId('deadline-chip')).not.toBeInTheDocument()
    })
  })

  describe('Dropdown Menu', () => {
    it('should render dropdown menu trigger', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument()
    })

    it('should open dropdown menu when trigger is clicked', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      expect(screen.getByTestId('card-dropdown-menu')).toBeInTheDocument()
    })

    it('should render Edit action in dropdown', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
    })

    it('should render Delete action in dropdown', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
    })

    it('should call delete mutation when Delete is clicked', async () => {
      renderWithRouter(<TodoItem {...defaultProps} showDelete={true} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const deleteButton = screen.getByRole('menuitem', { name: 'Delete' })
      await userEvent.click(deleteButton)

      expect(mockDeleteMutate).toHaveBeenCalledWith(1)
    })

    it('should NOT call delete mutation when showDelete is false', async () => {
      renderWithRouter(<TodoItem {...defaultProps} showDelete={false} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      // Delete button should still be in the dropdown but won't call mutation
      const deleteButton = screen.getByRole('menuitem', { name: 'Delete' })
      await userEvent.click(deleteButton)

      // Delete mutation should NOT be called when showDelete is false
      expect(mockDeleteMutate).not.toHaveBeenCalled()
    })

    it('should trigger onEdit callback when Edit is clicked (placeholder)', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const triggerButton = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(triggerButton)

      const editButton = screen.getByRole('menuitem', { name: 'Edit' })
      // Edit is currently a placeholder - clicking it should not throw
      await userEvent.click(editButton)

      // Menu should close after clicking
      expect(screen.queryByTestId('card-dropdown-menu')).not.toBeInTheDocument()
    })
  })

  describe('Expand/Collapse Behavior', () => {
    it('should start collapsed by default', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const expandableContent = screen.getByTestId('todo-card-expandable')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should expand when card is clicked', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      const expandableContent = screen.getByTestId('todo-card-expandable')
      expect(expandableContent).toHaveClass('[grid-template-rows:1fr]')
    })

    it('should NOT expand when clicking on checkbox', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      await userEvent.click(checkbox)

      const expandableContent = screen.getByTestId('todo-card-expandable')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should NOT expand when clicking on dropdown trigger', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const dropdownTrigger = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(dropdownTrigger)

      const expandableContent = screen.getByTestId('todo-card-expandable')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible checkbox', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
    })

    it('should have more options button accessible by label', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument()
    })

    it('should have cursor-pointer on card', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('cursor-pointer')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty description gracefully', () => {
      const emptyDescTodo = { ...mockTodo, description: '' }
      renderWithRouter(<TodoItem {...defaultProps} todo={emptyDescTodo} />)

      expect(screen.getByTestId('todo-card')).toBeInTheDocument()
    })

    it('should handle very long description', () => {
      const longDescription = 'A'.repeat(1000)
      const longDescTodo = { ...mockTodo, description: longDescription }
      renderWithRouter(<TodoItem {...defaultProps} todo={longDescTodo} />)

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('line-clamp-2')
    })

    it('should handle in_progress status (not completed)', () => {
      const inProgressTodo = { ...mockTodo, status: 'in_progress' as const }
      renderWithRouter(<TodoItem {...defaultProps} todo={inProgressTodo} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()

      const title = screen.getByTestId('todo-card-title')
      expect(title).not.toHaveClass('line-through')
    })
  })
})