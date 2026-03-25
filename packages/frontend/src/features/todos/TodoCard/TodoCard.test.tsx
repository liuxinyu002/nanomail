import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { endOfDay, parseISO } from 'date-fns'
import { TodoCard } from './TodoCard'
import { TodoCardHeader } from './TodoCardHeader'
import { TodoCardContent } from './TodoCardContent'
import { DeadlineChip } from './DeadlineChip'
import { EmailLinkIcon } from './EmailLinkIcon'
import type { Todo } from '@nanomail/shared'

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

// Helper to create mock Todo
function createMockTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    emailId: 100,
    description: 'Test todo description',
    status: 'pending',
    deadline: null,
    boardColumnId: 1,
    position: 0,
    notes: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }
}

// Helper to find the delete icon button (not the AlertDialog action button)
function getDeleteIconButton(): HTMLElement | undefined {
  const buttons = screen.queryAllByRole('button')
  return buttons.find(btn =>
    btn.getAttribute('aria-label') === 'Delete' &&
    !btn.hasAttribute('data-testid')
  )
}

// Wrapper for components that need router
function renderWithRouter(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  )
}

describe('TodoCard', () => {
  const defaultOnToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Card Styling', () => {
    it('should render with white background', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('bg-white')
    })

    it('should have shadow-sm for consistent light shadow', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('shadow-sm')
    })

    it('should have hover:shadow-md for hover effect', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('hover:shadow-md')
    })

    it('should have subtle border for edge definition', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('border')
      expect(card).toHaveClass('border-gray-100')
    })

    it('should have correct padding (p-4)', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('p-4')
    })

    it('should have margin bottom (mb-2)', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('mb-2')
    })

    it('should have rounded corners', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('rounded-md')
    })
  })

  describe('Checkbox Behavior', () => {
    it('should render unchecked checkbox for pending todo', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ status: 'pending' })}
          onToggle={defaultOnToggle}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('should render checked checkbox for completed todo', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ status: 'completed' })}
          onToggle={defaultOnToggle}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should call onToggle when checkbox is clicked', async () => {
      const onToggle = vi.fn()
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={onToggle}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      await userEvent.click(checkbox)

      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('should have brand blue color when checked', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ status: 'completed' })}
          onToggle={defaultOnToggle}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      // Check for data-state attribute or class
      expect(checkbox).toHaveAttribute('data-state', 'checked')
    })
  })

  describe('Title Display', () => {
    it('should display todo description', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ description: 'My test task' })}
          onToggle={defaultOnToggle}
        />
      )

      // Use testid to get the specific title element, not the textarea
      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveTextContent('My test task')
    })

    it('should have primary text color', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('text-[#111827]')
    })

    it('should have font-medium class', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('font-medium')
    })

    it('should have line-clamp-2 by default (not expanded)', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('line-clamp-2')
    })

    it('should show line-through for completed todos', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ status: 'completed' })}
          onToggle={defaultOnToggle}
        />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('line-through')
    })

    it('should show opacity-50 for completed todos', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ status: 'completed' })}
          onToggle={defaultOnToggle}
        />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('opacity-50')
    })
  })

  describe('Expansion Behavior', () => {
    it('should start collapsed by default', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const expandableContent = screen.getByTestId('task-detail-expand')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should expand when card body is clicked', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      const expandableContent = screen.getByTestId('task-detail-expand')
      expect(expandableContent).toHaveClass('[grid-template-rows:1fr]')
    })

    it('should collapse when expanded card is clicked again', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      // Click to expand
      await userEvent.click(card)
      // Click to collapse
      await userEvent.click(card)

      const expandableContent = screen.getByTestId('task-detail-expand')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should NOT expand when clicking on checkbox', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      await userEvent.click(checkbox)

      const expandableContent = screen.getByTestId('task-detail-expand')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should NOT expand when clicking on delete icon button', async () => {
      const onDelete = vi.fn()
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
          onDelete={onDelete}
        />
      )

      const deleteIconButton = getDeleteIconButton()
      await userEvent.click(deleteIconButton!)

      const expandableContent = screen.getByTestId('task-detail-expand')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should NOT expand when clicking on email link', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ emailId: 123 })}
          onToggle={defaultOnToggle}
        />
      )

      const emailLink = screen.getByRole('link')
      fireEvent.click(emailLink)

      const expandableContent = screen.getByTestId('task-detail-expand')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should NOT expand when clicking on textarea', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      // First expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Click on textarea should not collapse
      const textarea = screen.getByLabelText(/描述/i)
      await userEvent.click(textarea)

      const expandableContent = screen.getByTestId('task-detail-expand')
      expect(expandableContent).toHaveClass('[grid-template-rows:1fr]')
    })

    it('should NOT expand when clicking on input field', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ deadline: '2024-12-25T23:59:59.999Z' })}
          onToggle={defaultOnToggle}
        />
      )

      // First expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Click on date input should not collapse
      const dateInput = screen.getByLabelText(/截止时间/i)
      fireEvent.click(dateInput)

      const expandableContent = screen.getByTestId('task-detail-expand')
      expect(expandableContent).toHaveClass('[grid-template-rows:1fr]')
    })

    it('should remove line-clamp-2 when expanded', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      const title = screen.getByTestId('todo-card-title')
      expect(title).not.toHaveClass('line-clamp-2')
    })
  })

  describe('Delete Icon Button Integration', () => {
    it('should render delete icon button when onDelete is provided', () => {
      const onDelete = vi.fn()
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
          onDelete={onDelete}
        />
      )

      const deleteIconButton = getDeleteIconButton()
      expect(deleteIconButton).toBeInTheDocument()
    })

    it('should NOT render delete icon button when onDelete is not provided', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const deleteIconButton = getDeleteIconButton()
      expect(deleteIconButton).toBeUndefined()
    })

    it('should NOT render delete icon button when readonly=true', () => {
      const onDelete = vi.fn()
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
          onDelete={onDelete}
          readonly={true}
        />
      )

      const deleteIconButton = getDeleteIconButton()
      expect(deleteIconButton).toBeUndefined()
    })

    it('should NOT render delete icon button when showDelete=false', () => {
      const onDelete = vi.fn()
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
          onDelete={onDelete}
          showDelete={false}
        />
      )

      const deleteIconButton = getDeleteIconButton()
      expect(deleteIconButton).toBeUndefined()
    })

    it('should show confirmation dialog when delete icon is clicked', async () => {
      const onDelete = vi.fn()
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
          onDelete={onDelete}
        />
      )

      const deleteIconButton = getDeleteIconButton()
      await userEvent.click(deleteIconButton!)

      // AlertDialog should appear
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    })

    it('should call onDelete when delete is confirmed', async () => {
      const onDelete = vi.fn()
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
          onDelete={onDelete}
        />
      )

      const deleteIconButton = getDeleteIconButton()
      await userEvent.click(deleteIconButton!)

      // Click confirm in AlertDialog
      const confirmButton = screen.getByTestId('alert-dialog-action')
      await userEvent.click(confirmButton)

      expect(onDelete).toHaveBeenCalled()
    })

    it('should NOT call onDelete when delete is cancelled', async () => {
      const onDelete = vi.fn()
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
          onDelete={onDelete}
        />
      )

      const deleteIconButton = getDeleteIconButton()
      await userEvent.click(deleteIconButton!)

      // Click cancel in AlertDialog
      const cancelButton = screen.getByTestId('alert-dialog-cancel')
      await userEvent.click(cancelButton)

      expect(onDelete).not.toHaveBeenCalled()
    })
  })

  describe('Readonly Mode', () => {
    it('should hide delete icon when readonly=true', () => {
      const onDelete = vi.fn()
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
          onDelete={onDelete}
          readonly={true}
        />
      )

      const deleteIconButton = getDeleteIconButton()
      expect(deleteIconButton).toBeUndefined()
    })

    it('should disable editing in TaskDetailExpand when readonly=true', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ description: 'Test task', notes: 'Test notes' })}
          onToggle={defaultOnToggle}
          readonly={true}
        />
      )

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Should not have textareas (readonly mode)
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      // Should display text instead - look within the expandable content
      const expandable = screen.getByTestId('task-detail-expand')
      expect(expandable).toHaveTextContent('Test task')
      expect(expandable).toHaveTextContent('Test notes')
    })

    it('should show text content in readonly mode', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ description: 'Readonly desc', notes: 'Readonly notes' })}
          onToggle={defaultOnToggle}
          readonly={true}
        />
      )

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Should show description and notes as text - look within expandable content
      const expandable = screen.getByTestId('task-detail-expand')
      expect(expandable).toHaveTextContent('Readonly desc')
      expect(expandable).toHaveTextContent('Readonly notes')
    })

    it('should show formatted deadline in readonly mode', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ deadline: '2024-12-25T23:59:59.999Z' })}
          onToggle={defaultOnToggle}
          readonly={true}
        />
      )

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Should show formatted date (MM-DD HH:mm format)
      // UTC 2024-12-25T23:59:59.999Z = local time 2024-12-26 07:59 (UTC+8)
      expect(screen.getByText('12-26 07:59')).toBeInTheDocument()
    })

    it('should show "无详细信息" when all fields are empty in readonly mode', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ description: '', notes: null, deadline: null })}
          onToggle={defaultOnToggle}
          readonly={true}
        />
      )

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      expect(screen.getByText('无详细信息')).toBeInTheDocument()
    })
  })

  describe('Save Handlers', () => {
    it('should call onSaveDescription when description is changed and blurred', async () => {
      const onSaveDescription = vi.fn().mockResolvedValue(undefined)
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ description: 'Original' })}
          onToggle={defaultOnToggle}
          onSaveDescription={onSaveDescription}
        />
      )

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Change description
      const textarea = screen.getByLabelText(/描述/i)
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'New description')
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(onSaveDescription).toHaveBeenCalledWith('New description')
      })
    })

    it('should call onSaveNotes when notes is changed and blurred', async () => {
      const onSaveNotes = vi.fn().mockResolvedValue(undefined)
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ notes: null })}
          onToggle={defaultOnToggle}
          onSaveNotes={onSaveNotes}
        />
      )

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Change notes
      const textarea = screen.getByLabelText(/笔记/i)
      await userEvent.type(textarea, 'New notes')
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(onSaveNotes).toHaveBeenCalledWith('New notes')
      })
    })

    it('should call onSaveNotes with null when notes is cleared', async () => {
      const onSaveNotes = vi.fn().mockResolvedValue(undefined)
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ notes: 'Original notes' })}
          onToggle={defaultOnToggle}
          onSaveNotes={onSaveNotes}
        />
      )

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Clear notes
      const textarea = screen.getByLabelText(/笔记/i)
      await userEvent.clear(textarea)
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(onSaveNotes).toHaveBeenCalledWith(null)
      })
    })

    it('should call onSaveDeadline when deadline is changed', async () => {
      const onSaveDeadline = vi.fn().mockResolvedValue(undefined)
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ deadline: null })}
          onToggle={defaultOnToggle}
          onSaveDeadline={onSaveDeadline}
        />
      )

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // Change deadline - date input format
      const dateInput = screen.getByLabelText(/截止时间/i)
      fireEvent.change(dateInput, { target: { value: '2024-12-25' } })

      await waitFor(() => {
        // date is saved as end of day in local timezone, converted to UTC ISO string
        expect(onSaveDeadline).toHaveBeenCalledWith(endOfDay(parseISO('2024-12-25')).toISOString())
      })
    })

    it('should NOT call save handlers when readonly=true', async () => {
      const onSaveDescription = vi.fn()
      const onSaveNotes = vi.fn()
      const onSaveDeadline = vi.fn()
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ description: 'Test', notes: 'Notes' })}
          onToggle={defaultOnToggle}
          readonly={true}
          onSaveDescription={onSaveDescription}
          onSaveNotes={onSaveNotes}
          onSaveDeadline={onSaveDeadline}
        />
      )

      // Expand the card
      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      // In readonly mode, there are no textareas to change
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(onSaveDescription).not.toHaveBeenCalled()
      expect(onSaveNotes).not.toHaveBeenCalled()
      expect(onSaveDeadline).not.toHaveBeenCalled()
    })
  })
})

describe('TodoCardHeader', () => {
  const defaultProps = {
    description: 'Test task',
    completed: false,
    onToggle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Checkbox', () => {
    it('should render checkbox', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} />
      )

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('should show unchecked state when completed is false', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} completed={false} />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('should show checked state when completed is true', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} completed={true} />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should call onToggle when checkbox is clicked', async () => {
      const onToggle = vi.fn()
      renderWithRouter(
        <TodoCardHeader {...defaultProps} onToggle={onToggle} />
      )

      await userEvent.click(screen.getByRole('checkbox'))
      expect(onToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('Title', () => {
    it('should display description', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} description="My Task" />
      )

      expect(screen.getByText('My Task')).toBeInTheDocument()
    })

    it('should have line-clamp-2 when not expanded', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} isExpanded={false} />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('line-clamp-2')
    })

    it('should NOT have line-clamp-2 when expanded', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} isExpanded={true} />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).not.toHaveClass('line-clamp-2')
    })

    it('should have line-through and opacity when completed', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} completed={true} />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('line-through')
      expect(title).toHaveClass('opacity-50')
    })
  })

  describe('Delete Icon Button', () => {
    it('should render delete icon button when showDelete=true (default) and onDelete is provided', () => {
      const onDelete = vi.fn()
      renderWithRouter(
        <TodoCardHeader {...defaultProps} onDelete={onDelete} />
      )

      const deleteIconButton = getDeleteIconButton()
      expect(deleteIconButton).toBeInTheDocument()
    })

    it('should NOT render delete icon button when onDelete is not provided', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} />
      )

      const deleteIconButton = getDeleteIconButton()
      expect(deleteIconButton).toBeUndefined()
    })

    it('should NOT render delete icon button when showDelete=false', () => {
      const onDelete = vi.fn()
      renderWithRouter(
        <TodoCardHeader {...defaultProps} onDelete={onDelete} showDelete={false} />
      )

      const deleteIconButton = getDeleteIconButton()
      expect(deleteIconButton).toBeUndefined()
    })

    it('should render delete icon button when showDelete=true and onDelete is provided', () => {
      const onDelete = vi.fn()
      renderWithRouter(
        <TodoCardHeader {...defaultProps} onDelete={onDelete} showDelete={true} />
      )

      const deleteIconButton = getDeleteIconButton()
      expect(deleteIconButton).toBeInTheDocument()
    })

    it('should pass onDelete to DeleteIconButton', async () => {
      const onDelete = vi.fn()
      renderWithRouter(
        <TodoCardHeader {...defaultProps} onDelete={onDelete} />
      )

      const deleteIconButton = getDeleteIconButton()
      await userEvent.click(deleteIconButton!)

      // AlertDialog should appear
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    })

    it('should stop propagation when delete icon is clicked (card should not expand)', async () => {
      const onDelete = vi.fn()
      const parentClickHandler = vi.fn()

      render(
        <div onClick={parentClickHandler}>
          <TodoCardHeader {...defaultProps} onDelete={onDelete} />
        </div>
      )

      const deleteIconButton = getDeleteIconButton()
      await userEvent.click(deleteIconButton!)

      // Parent click handler should NOT be called due to stopPropagation
      expect(parentClickHandler).not.toHaveBeenCalled()
    })
  })
})

describe('TodoCardContent', () => {
  const defaultOnSaveDescription = vi.fn()
  const defaultOnSaveNotes = vi.fn()
  const defaultOnSaveDeadline = vi.fn()

  // Helper to create mock todo data
  function createMockTodoData(overrides: Partial<{
    id: number
    description: string
    notes: string | null
    deadline: string | null
    emailId: number | null
  }> = {}) {
    return {
      id: 1,
      description: 'Test description',
      notes: null,
      deadline: null,
      emailId: null,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Metadata Row', () => {
    it('should render metadata row when collapsed with deadline', () => {
      renderWithRouter(
        <TodoCardContent
          todo={createMockTodoData({ deadline: '2024-12-25T00:00:00Z' })}
          isExpanded={false}
          onSaveDescription={defaultOnSaveDescription}
          onSaveNotes={defaultOnSaveNotes}
          onSaveDeadline={defaultOnSaveDeadline}
        />
      )

      // Format: MM-DD HH:mm (UTC 2024-12-25T00:00:00Z = local 2024-12-25 08:00 UTC+8)
      expect(screen.getByText('12-25 08:00')).toBeInTheDocument()
    })

    it('should render metadata row when collapsed with emailId', () => {
      renderWithRouter(
        <TodoCardContent
          todo={createMockTodoData({ emailId: 123 })}
          isExpanded={false}
          onSaveDescription={defaultOnSaveDescription}
          onSaveNotes={defaultOnSaveNotes}
          onSaveDeadline={defaultOnSaveDeadline}
        />
      )

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/inbox/123')
    })

    it('should NOT render metadata row when expanded', () => {
      renderWithRouter(
        <TodoCardContent
          todo={createMockTodoData({ deadline: '2024-12-25T00:00:00Z', emailId: 123 })}
          isExpanded={true}
          onSaveDescription={defaultOnSaveDescription}
          onSaveNotes={defaultOnSaveNotes}
          onSaveDeadline={defaultOnSaveDeadline}
        />
      )

      // DeadlineChip and EmailLinkIcon should not be visible when expanded
      expect(screen.queryByTestId('deadline-chip')).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /view associated email/i })).not.toBeInTheDocument()
    })

    it('should NOT render metadata row when no deadline or emailId', () => {
      renderWithRouter(
        <TodoCardContent
          todo={createMockTodoData()}
          isExpanded={false}
          onSaveDescription={defaultOnSaveDescription}
          onSaveNotes={defaultOnSaveNotes}
          onSaveDeadline={defaultOnSaveDeadline}
        />
      )

      expect(screen.queryByTestId('deadline-chip')).not.toBeInTheDocument()
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })
  })

  describe('TaskDetailExpand Integration', () => {
    it('should pass description to TaskDetailExpand', () => {
      renderWithRouter(
        <TodoCardContent
          todo={createMockTodoData({ description: 'My task' })}
          isExpanded={true}
          onSaveDescription={defaultOnSaveDescription}
          onSaveNotes={defaultOnSaveNotes}
          onSaveDeadline={defaultOnSaveDeadline}
        />
      )

      const textarea = screen.getByLabelText(/描述/i)
      expect(textarea).toHaveValue('My task')
    })

    it('should pass notes to TaskDetailExpand', () => {
      renderWithRouter(
        <TodoCardContent
          todo={createMockTodoData({ notes: 'My notes' })}
          isExpanded={true}
          onSaveDescription={defaultOnSaveDescription}
          onSaveNotes={defaultOnSaveNotes}
          onSaveDeadline={defaultOnSaveDeadline}
        />
      )

      const textarea = screen.getByLabelText(/笔记/i)
      expect(textarea).toHaveValue('My notes')
    })

    it('should pass deadline to TaskDetailExpand', () => {
      renderWithRouter(
        <TodoCardContent
          todo={createMockTodoData({ deadline: '2024-12-25T23:59:59.999Z' })}
          isExpanded={true}
          onSaveDescription={defaultOnSaveDescription}
          onSaveNotes={defaultOnSaveNotes}
          onSaveDeadline={defaultOnSaveDeadline}
        />
      )

      const dateInput = screen.getByLabelText(/截止时间/i)
      // date input value: UTC 2024-12-25T23:59:59.999Z = local 2024-12-26 (UTC+8)
      expect(dateInput).toHaveValue('2024-12-26')
    })

    it('should pass isExpanded prop to TaskDetailExpand', () => {
      renderWithRouter(
        <TodoCardContent
          todo={createMockTodoData()}
          isExpanded={false}
          onSaveDescription={defaultOnSaveDescription}
          onSaveNotes={defaultOnSaveNotes}
          onSaveDeadline={defaultOnSaveDeadline}
        />
      )

      const expandable = screen.getByTestId('task-detail-expand')
      expect(expandable).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should pass readonly prop to TaskDetailExpand', () => {
      renderWithRouter(
        <TodoCardContent
          todo={createMockTodoData({ description: 'Test' })}
          isExpanded={true}
          readonly={true}
          onSaveDescription={defaultOnSaveDescription}
          onSaveNotes={defaultOnSaveNotes}
          onSaveDeadline={defaultOnSaveDeadline}
        />
      )

      // In readonly mode, no textareas
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.getByText('Test')).toBeInTheDocument()
    })

    it('should pass save callbacks to TaskDetailExpand', async () => {
      const onSaveDescription = vi.fn().mockResolvedValue(undefined)
      renderWithRouter(
        <TodoCardContent
          todo={createMockTodoData({ description: 'Test' })}
          isExpanded={true}
          onSaveDescription={onSaveDescription}
          onSaveNotes={defaultOnSaveNotes}
          onSaveDeadline={defaultOnSaveDeadline}
        />
      )

      const textarea = screen.getByLabelText(/描述/i)
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'Changed')
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(onSaveDescription).toHaveBeenCalledWith('Changed')
      })
    })
  })

  describe('Expandable Area', () => {
    it('should be collapsed when isExpanded is false', () => {
      renderWithRouter(
        <TodoCardContent
          todo={createMockTodoData()}
          isExpanded={false}
          onSaveDescription={defaultOnSaveDescription}
          onSaveNotes={defaultOnSaveNotes}
          onSaveDeadline={defaultOnSaveDeadline}
        />
      )

      const expandable = screen.getByTestId('task-detail-expand')
      expect(expandable).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should be expanded when isExpanded is true', () => {
      renderWithRouter(
        <TodoCardContent
          todo={createMockTodoData()}
          isExpanded={true}
          onSaveDescription={defaultOnSaveDescription}
          onSaveNotes={defaultOnSaveNotes}
          onSaveDeadline={defaultOnSaveDeadline}
        />
      )

      const expandable = screen.getByTestId('task-detail-expand')
      expect(expandable).toHaveClass('[grid-template-rows:1fr]')
    })

    it('should have transition class for animation', () => {
      renderWithRouter(
        <TodoCardContent
          todo={createMockTodoData()}
          isExpanded={false}
          onSaveDescription={defaultOnSaveDescription}
          onSaveNotes={defaultOnSaveNotes}
          onSaveDeadline={defaultOnSaveDeadline}
        />
      )

      const expandable = screen.getByTestId('task-detail-expand')
      expect(expandable).toHaveClass('transition-[grid-template-rows]')
    })
  })
})

describe('DeadlineChip', () => {
  it('should render calendar icon', () => {
    renderWithRouter(<DeadlineChip deadline="2024-12-25T00:00:00Z" />)

    const chip = screen.getByTestId('deadline-chip')
    expect(chip.querySelector('svg')).toBeInTheDocument()
  })

  it('should format date string correctly', () => {
    renderWithRouter(<DeadlineChip deadline="2024-03-15T00:00:00Z" />)

    // Format: MM-DD HH:mm (UTC 2024-03-15T00:00:00Z = local 2024-03-15 08:00 UTC+8)
    expect(screen.getByText('03-15 08:00')).toBeInTheDocument()
  })

  it('should format Date object correctly', () => {
    renderWithRouter(<DeadlineChip deadline={new Date('2024-07-04T00:00:00Z')} />)

    // Format: MM-DD HH:mm
    expect(screen.getByText('07-04 08:00')).toBeInTheDocument()
  })

  it('should have secondary text color', () => {
    renderWithRouter(<DeadlineChip deadline="2024-12-25T00:00:00Z" />)

    const chip = screen.getByTestId('deadline-chip')
    expect(chip).toHaveClass('text-[#6B7280]')
  })

  it('should have small text size', () => {
    renderWithRouter(<DeadlineChip deadline="2024-12-25T00:00:00Z" />)

    const chip = screen.getByTestId('deadline-chip')
    expect(chip).toHaveClass('text-sm')
  })
})

describe('EmailLinkIcon', () => {
  it('should render link with correct href', () => {
    renderWithRouter(<EmailLinkIcon emailId="456" />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/inbox/456')
  })

  it('should render ExternalLink icon', () => {
    renderWithRouter(<EmailLinkIcon emailId="123" />)

    const link = screen.getByRole('link')
    expect(link.querySelector('svg')).toBeInTheDocument()
  })

  it('should have secondary text color by default', () => {
    renderWithRouter(<EmailLinkIcon emailId="123" />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('text-[#6B7280]')
  })

  it('should have brand blue hover color', () => {
    renderWithRouter(<EmailLinkIcon emailId="123" />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('hover:text-[#2563EB]')
  })

  it('should have transition for color change', () => {
    renderWithRouter(<EmailLinkIcon emailId="123" />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('transition-colors')
  })
})

describe('Edge Cases', () => {
  const defaultOnToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle empty description gracefully', () => {
    renderWithRouter(
      <TodoCard
        todo={createMockTodo({ description: '' })}
        onToggle={defaultOnToggle}
      />
    )

    // Should render without errors
    expect(screen.getByTestId('todo-card')).toBeInTheDocument()
  })

  it('should handle very long description', () => {
    const longDescription = 'A'.repeat(1000)
    renderWithRouter(
      <TodoCard
        todo={createMockTodo({ description: longDescription })}
        onToggle={defaultOnToggle}
      />
    )

    const title = screen.getByTestId('todo-card-title')
    expect(title).toHaveClass('line-clamp-2')
  })

  it('should handle in_progress status (not completed)', () => {
    renderWithRouter(
      <TodoCard
        todo={createMockTodo({ status: 'in_progress' })}
        onToggle={defaultOnToggle}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    const title = screen.getByTestId('todo-card-title')
    expect(title).not.toHaveClass('line-through')
  })

  it('should accept custom className', () => {
    renderWithRouter(
      <TodoCard
        todo={createMockTodo()}
        onToggle={defaultOnToggle}
        className="custom-class"
      />
    )

    const card = screen.getByTestId('todo-card')
    expect(card).toHaveClass('custom-class')
  })

  it('should work without optional callbacks', () => {
    // Should not throw with only required props
    renderWithRouter(
      <TodoCard
        todo={createMockTodo()}
        onToggle={defaultOnToggle}
      />
    )

    expect(screen.getByTestId('todo-card')).toBeInTheDocument()
  })
})

describe('Accessibility', () => {
  const defaultOnToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have cursor-pointer on card', () => {
    renderWithRouter(
      <TodoCard
        todo={createMockTodo()}
        onToggle={defaultOnToggle}
      />
    )

    const card = screen.getByTestId('todo-card')
    expect(card).toHaveClass('cursor-pointer')
  })

  it('should have checkbox accessible by role', () => {
    renderWithRouter(
      <TodoCard
        todo={createMockTodo()}
        onToggle={defaultOnToggle}
      />
    )

    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('should have delete button accessible by label when onDelete provided', () => {
    const onDelete = vi.fn()
    renderWithRouter(
      <TodoCard
        todo={createMockTodo()}
        onToggle={defaultOnToggle}
        onDelete={onDelete}
      />
    )

    const deleteIconButton = getDeleteIconButton()
    expect(deleteIconButton).toBeInTheDocument()
  })
})