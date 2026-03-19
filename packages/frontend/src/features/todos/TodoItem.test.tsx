import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

// Mock AlertDialog to avoid portal issues in tests
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="alert-dialog" data-open={open}>{children}</div>
  ),
  AlertDialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="alert-dialog-trigger">{children}</div>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="alert-dialog-title">{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="alert-dialog-description">{children}</p>
  ),
  AlertDialogAction: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button data-testid="alert-dialog-action" onClick={onClick} className={className}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
}))

// Helper to render with router
function renderWithRouter(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  )
}

// Helper to find the delete icon button (not the AlertDialog action button)
function getDeleteIconButton(): HTMLElement | undefined {
  const buttons = screen.queryAllByRole('button')
  return buttons.find(btn =>
    btn.getAttribute('aria-label') === 'Delete' &&
    !btn.hasAttribute('data-testid')
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

      // Use testid to get the specific title element
      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveTextContent('Review the quarterly report')
    })

    it('should have white background', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('bg-white')
    })

    it('should have soft shadow', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const card = screen.getByTestId('todo-card')
      // shadow-sm is the simplified shadow class
      expect(card).toHaveClass('shadow-sm')
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

  describe('Delete Icon Button', () => {
    it('should render delete icon button when showDelete=true', () => {
      renderWithRouter(<TodoItem {...defaultProps} showDelete={true} />)

      const deleteIconButton = getDeleteIconButton()
      expect(deleteIconButton).toBeInTheDocument()
    })

    it('should NOT render delete icon button when showDelete=false (default)', () => {
      renderWithRouter(<TodoItem {...defaultProps} showDelete={false} />)

      const deleteIconButton = getDeleteIconButton()
      expect(deleteIconButton).toBeUndefined()
    })

    it('should show confirmation dialog when delete icon is clicked', async () => {
      renderWithRouter(<TodoItem {...defaultProps} showDelete={true} />)

      const deleteIconButton = getDeleteIconButton()
      await userEvent.click(deleteIconButton!)

      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    })

    it('should call delete mutation when Delete is confirmed', async () => {
      renderWithRouter(<TodoItem {...defaultProps} showDelete={true} />)

      const deleteIconButton = getDeleteIconButton()
      await userEvent.click(deleteIconButton!)

      const confirmButton = screen.getByTestId('alert-dialog-action')
      await userEvent.click(confirmButton)

      expect(mockDeleteMutate).toHaveBeenCalledWith(1)
    })

    it('should NOT call delete mutation when cancelled', async () => {
      renderWithRouter(<TodoItem {...defaultProps} showDelete={true} />)

      const deleteIconButton = getDeleteIconButton()
      await userEvent.click(deleteIconButton!)

      const cancelButton = screen.getByTestId('alert-dialog-cancel')
      await userEvent.click(cancelButton)

      expect(mockDeleteMutate).not.toHaveBeenCalled()
    })

    it('should NOT call delete mutation when showDelete is false', async () => {
      renderWithRouter(<TodoItem {...defaultProps} showDelete={false} />)

      // No delete button should be present
      const deleteIconButton = getDeleteIconButton()
      expect(deleteIconButton).toBeUndefined()

      // Delete mutation should NOT be called
      expect(mockDeleteMutate).not.toHaveBeenCalled()
    })
  })

  describe('Expand/Collapse Behavior', () => {
    it('should start collapsed by default', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const expandableContent = screen.getByTestId('task-detail-expand')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should expand when card is clicked', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      const expandableContent = screen.getByTestId('task-detail-expand')
      expect(expandableContent).toHaveClass('[grid-template-rows:1fr]')
    })

    it('should NOT expand when clicking on checkbox', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      await userEvent.click(checkbox)

      const expandableContent = screen.getByTestId('task-detail-expand')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should NOT expand when clicking on delete icon button', async () => {
      renderWithRouter(<TodoItem {...defaultProps} showDelete={true} />)

      const deleteIconButton = getDeleteIconButton()
      await userEvent.click(deleteIconButton!)

      const expandableContent = screen.getByTestId('task-detail-expand')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible checkbox', () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
    })

    it('should have delete button accessible by label when showDelete=true', () => {
      renderWithRouter(<TodoItem {...defaultProps} showDelete={true} />)

      const deleteIconButton = getDeleteIconButton()
      expect(deleteIconButton).toBeInTheDocument()
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

  describe('Save Handlers Integration', () => {
    it('should call updateMutation when description is saved', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Change description
      const textarea = screen.getByLabelText(/描述/i)
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'New description')
      fireEvent.blur(textarea)

      // Wait for the mutation to be called
      await waitFor(() => {
        expect(mockUpdateMutate).toHaveBeenCalledWith({
          id: 1,
          data: { description: 'New description' },
        })
      })
    })

    it('should call updateMutation when notes is saved', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Change notes
      const textarea = screen.getByLabelText(/笔记/i)
      await userEvent.type(textarea, 'New notes')
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(mockUpdateMutate).toHaveBeenCalledWith({
          id: 1,
          data: { notes: 'New notes' },
        })
      })
    })

    it('should call updateMutation with null when notes is cleared', async () => {
      const todoWithNotes = { ...mockTodo, notes: 'Original notes' }
      renderWithRouter(<TodoItem {...defaultProps} todo={todoWithNotes} />)

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Clear notes
      const textarea = screen.getByLabelText(/笔记/i)
      await userEvent.clear(textarea)
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(mockUpdateMutate).toHaveBeenCalledWith({
          id: 1,
          data: { notes: null },
        })
      })
    })

    it('should call updateMutation when deadline is saved', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Change deadline
      const dateInput = screen.getByLabelText(/截止时间/i)
      fireEvent.change(dateInput, { target: { value: '2024-12-25' } })

      await waitFor(() => {
        expect(mockUpdateMutate).toHaveBeenCalledWith({
          id: 1,
          data: { deadline: '2024-12-25T23:59:59.999Z' },
        })
      })
    })

    it('should call updateMutation with null when deadline is cleared', async () => {
      const todoWithDeadline = { ...mockTodo, deadline: '2024-12-25T23:59:59.999Z' }
      renderWithRouter(<TodoItem {...defaultProps} todo={todoWithDeadline} />)

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Clear deadline
      const clearButton = screen.getByText('清除')
      await userEvent.click(clearButton)

      await waitFor(() => {
        expect(mockUpdateMutate).toHaveBeenCalledWith({
          id: 1,
          data: { deadline: null },
        })
      })
    })

    it('should NOT call updateMutation when description unchanged', async () => {
      renderWithRouter(<TodoItem {...defaultProps} />)

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Focus and blur without changing
      const textarea = screen.getByLabelText(/描述/i)
      fireEvent.blur(textarea)

      // Wait a bit to ensure no mutation is called
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockUpdateMutate).not.toHaveBeenCalled()
    })
  })
})