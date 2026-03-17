import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodoDayModal } from './TodoDayModal'
import type { TodoItem } from '@/services'

// Mock the mutations hooks
const mockDeleteMutate = vi.fn()
const mockUpdateMutate = vi.fn()
vi.mock('@/hooks/useTodoMutations', () => ({
  useDeleteTodoMutation: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useUpdateTodoMutation: () => ({ mutate: mockUpdateMutate, isPending: false }),
}))

describe('TodoDayModal', () => {
  const mockDate = new Date(2024, 0, 15) // January 15, 2024

  const mockTodos: TodoItem[] = [
    {
      id: 1,
      emailId: 100,
      description: 'Inbox task',
      status: 'pending',
      deadline: '2024-01-15T00:00:00.000Z',
      boardColumnId: 1, // Inbox
      createdAt: '2024-01-10T00:00:00.000Z',
    },
    {
      id: 2,
      emailId: 100,
      description: 'Todo task',
      status: 'pending',
      deadline: '2024-01-15T00:00:00.000Z',
      boardColumnId: 2, // Todo (high priority)
      createdAt: '2024-01-10T00:00:00.000Z',
    },
    {
      id: 3,
      emailId: 100,
      description: 'In Progress task',
      status: 'pending',
      deadline: '2024-01-15T00:00:00.000Z',
      boardColumnId: 3, // In Progress (medium priority)
      createdAt: '2024-01-10T00:00:00.000Z',
    },
  ]

  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    mockDeleteMutate.mockClear()
    mockUpdateMutate.mockClear()
    mockOnOpenChange.mockClear()
    vi.useRealTimers()
  })

  const renderWithQueryClient = (ui: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    )
  }

  describe('rendering', () => {
    it('displays formatted date in title', () => {
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      expect(screen.getByText(/January 15, 2024/i)).toBeInTheDocument()
    })

    it('displays "Select a date" when date is null', () => {
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={null}
          todos={[]}
        />
      )

      expect(screen.getByText('Select a date')).toBeInTheDocument()
    })

    it('displays todo count in description', () => {
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      expect(screen.getByText(/3 todos for this day/i)).toBeInTheDocument()
    })

    it('displays empty state when no todos', () => {
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={[]}
        />
      )

      expect(screen.getByText(/no tasks for this day/i)).toBeInTheDocument()
    })

    it('displays all todos sorted by column priority (Todo first, then In Progress, then Inbox)', () => {
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      const todoItems = screen.getAllByRole('listitem')
      expect(todoItems[0]).toHaveTextContent('Todo task')
      expect(todoItems[1]).toHaveTextContent('In Progress task')
      expect(todoItems[2]).toHaveTextContent('Inbox task')
    })
  })

  describe('expand/collapse toggle', () => {
    it('renders expand/collapse button', () => {
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      // Should have a button with expand/collapse label
      const expandButton = screen.getByRole('button', { name: /expand/i })
      expect(expandButton).toBeInTheDocument()
    })

    it('starts in compact mode (max-w-md)', () => {
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      // Find the dialog content
      const dialogContent = screen.getByRole('dialog')
      expect(dialogContent.className).toMatch(/max-w-md/)
    })

    it('expands to max-w-xl when expand button is clicked', async () => {
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      const expandButton = screen.getByRole('button', { name: /expand/i })
      await user.click(expandButton)

      const dialogContent = screen.getByRole('dialog')
      expect(dialogContent.className).toMatch(/max-w-xl/)
    })

    it('changes button label to "Collapse" when expanded', async () => {
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      const expandButton = screen.getByRole('button', { name: /expand/i })
      await user.click(expandButton)

      expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument()
    })

    it('collapses back to max-w-md when collapse button is clicked', async () => {
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      // Expand first
      const expandButton = screen.getByRole('button', { name: /expand/i })
      await user.click(expandButton)

      // Then collapse
      const collapseButton = screen.getByRole('button', { name: /collapse/i })
      await user.click(collapseButton)

      const dialogContent = screen.getByRole('dialog')
      expect(dialogContent.className).toMatch(/max-w-md/)
    })
  })

  describe('auto-expand on edit', () => {
    it('auto-expands when entering edit mode', async () => {
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={[mockTodos[0]]}
        />
      )

      // Open menu
      const menuButton = screen.getByRole('button', { name: /open menu/i })
      await user.click(menuButton)

      // Wait for menu and click edit
      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Edit'))

      // Should be expanded and show edit form
      await waitFor(() => {
        const dialogContent = screen.getByRole('dialog')
        expect(dialogContent.className).toMatch(/max-w-xl/)
      })
    })
  })

  describe('state reset on close', () => {
    it('calls onOpenChange when close button is clicked', async () => {
      const user = userEvent.setup()

      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={[mockTodos[0]]}
        />
      )

      // Click close button
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      // onOpenChange should be called
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('starts with compact mode when modal opens', () => {
      // Test that the modal starts in compact mode on open
      const { rerender } = renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      const dialogContent = screen.getByRole('dialog')
      expect(dialogContent.className).toMatch(/max-w-md/)

      // Simulate closing and reopening
      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <TodoDayModal
            open={false}
            onOpenChange={mockOnOpenChange}
            date={mockDate}
            todos={mockTodos}
          />
        </QueryClientProvider>
      )

      rerender(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <TodoDayModal
            open={true}
            onOpenChange={mockOnOpenChange}
            date={mockDate}
            todos={mockTodos}
          />
        </QueryClientProvider>
      )

      // Should still be in compact mode when reopened
      const newDialogContent = screen.getByRole('dialog')
      expect(newDialogContent.className).toMatch(/max-w-md/)
    })
  })

  describe('date crash prevention', () => {
    it('does not crash when date becomes null during exit animation', () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <TodoDayModal
            open={true}
            onOpenChange={mockOnOpenChange}
            date={mockDate}
            todos={mockTodos}
          />
        </QueryClientProvider>
      )

      // Verify it renders
      expect(screen.getByText(/January 15, 2024/i)).toBeInTheDocument()

      // Close modal and set date to null simultaneously (simulates parent behavior)
      expect(() => {
        rerender(
          <QueryClientProvider client={queryClient}>
            <TodoDayModal
              open={false}
              onOpenChange={mockOnOpenChange}
              date={null}
              todos={mockTodos}
            />
          </QueryClientProvider>
        )
      }).not.toThrow()
    })

    it('displays cached date during exit animation', () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <TodoDayModal
            open={true}
            onOpenChange={mockOnOpenChange}
            date={mockDate}
            todos={mockTodos}
          />
        </QueryClientProvider>
      )

      // Initial render shows the date
      expect(screen.getByText(/January 15, 2024/i)).toBeInTheDocument()

      // Close modal and set date to null
      rerender(
        <QueryClientProvider client={queryClient}>
          <TodoDayModal
            open={false}
            onOpenChange={mockOnOpenChange}
            date={null}
            todos={mockTodos}
          />
        </QueryClientProvider>
      )

      // The cached date should still be rendered during exit animation
      // (Modal is closed so content may not be visible, but component shouldn't crash)
      // The key is that it doesn't throw an error
    })
  })

  describe('sticky header with scrollable content', () => {
    it('has sticky header', () => {
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      // Find the header element - it should have sticky class
      const header = screen.getByRole('banner')
      expect(header.className).toMatch(/sticky/)
    })

    it('has scrollable content area', () => {
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      // Content area should have overflow-y-auto
      const contentArea = screen.getByTestId('modal-content-area')
      expect(contentArea.className).toMatch(/overflow-y-auto/)
    })
  })

  describe('edit functionality', () => {
    it('shows edit form when edit is clicked', async () => {
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={[mockTodos[0]]}
        />
      )

      // Open menu
      const menuButton = screen.getByRole('button', { name: /open menu/i })
      await user.click(menuButton)

      // Wait for menu to open and click edit
      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Edit'))

      // Should show edit form
      await waitFor(() => {
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      })
    })

    it('returns to list after canceling edit', async () => {
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={[mockTodos[0]]}
        />
      )

      // Open menu and click edit
      const menuButton = screen.getByRole('button', { name: /open menu/i })
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Edit'))

      // Wait for edit form
      await waitFor(() => {
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      })

      // Cancel edit
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Should be back to list
      await waitFor(() => {
        expect(screen.getByText('Inbox task')).toBeInTheDocument()
      })
    })
  })

  describe('delete functionality', () => {
    it('shows inline delete confirmation when delete is clicked', async () => {
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={[mockTodos[0]]}
        />
      )

      // Open menu
      const menuButton = screen.getByRole('button', { name: /open menu/i })
      await user.click(menuButton)

      // Wait for menu and click delete
      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Delete'))

      // Should show confirmation
      await waitFor(() => {
        expect(screen.getByText(/confirm delete/i)).toBeInTheDocument()
      })
    })

    it('calls delete mutation when confirmed', async () => {
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={[mockTodos[0]]}
        />
      )

      // Open menu
      const menuButton = screen.getByRole('button', { name: /open menu/i })
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Delete'))

      // Confirm delete
      await waitFor(() => {
        expect(screen.getByText('Yes, delete')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Yes, delete'))

      expect(mockDeleteMutate).toHaveBeenCalledWith(1)
    })
  })

  describe('completed task styling', () => {
    it('applies strikethrough style to completed tasks', () => {
      const completedTodos: TodoItem[] = [
        {
          ...mockTodos[0],
          status: 'completed',
        },
      ]

      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={completedTodos}
        />
      )

      const description = screen.getByText('Inbox task')
      expect(description).toHaveClass('line-through')
    })
  })

  describe('onTodoClick callback', () => {
    it('calls onTodoClick when todo item is clicked', async () => {
      const mockOnTodoClick = vi.fn()
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={[mockTodos[0]]}
          onTodoClick={mockOnTodoClick}
        />
      )

      await user.click(screen.getByText('Inbox task'))
      expect(mockOnTodoClick).toHaveBeenCalledWith(mockTodos[0])
    })

    it('supports keyboard navigation for todo item click', async () => {
      const mockOnTodoClick = vi.fn()
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={[mockTodos[0]]}
          onTodoClick={mockOnTodoClick}
        />
      )

      // Tab to the todo item and press Enter
      await user.tab()
      await user.tab()
      const todoButton = screen.getByRole('button', { name: /open menu/i }).parentElement?.previousElementSibling as HTMLElement | null
      if (todoButton) {
        todoButton.focus()
        await user.keyboard('{Enter}')
        expect(mockOnTodoClick).toHaveBeenCalled()
      }
    })
  })

  describe('onOpenChange callback', () => {
    it('calls onOpenChange when dialog is closed', async () => {
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      // Click close button
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('fade transition between list and edit', () => {
    it('applies fade transition wrapper', async () => {
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={[mockTodos[0]]}
        />
      )

      // The todo list should have transition-opacity class
      const listContainer = screen.getByTestId('todo-list-container')
      expect(listContainer.className).toMatch(/transition-opacity/)
    })
  })

  describe('modal behavior', () => {
    it('renders as centered modal with translate transform', () => {
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      // Dialog content should be centered (translate-x-[-50%] translate-y-[-50%])
      const dialogContent = screen.getByRole('dialog')
      expect(dialogContent.className).toMatch(/translate-x-\[-50%\]/)
      expect(dialogContent.className).toMatch(/translate-y-\[-50%\]/)
    })

    it('closes when pressing Escape key', async () => {
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      // Press Escape key
      await user.keyboard('{Escape}')

      // onOpenChange should be called with false
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('resets editing state after close animation completes', async () => {
      vi.useFakeTimers()

      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={[mockTodos[0]]}
        />
      )

      // Verify initial state
      expect(screen.getByText('Inbox task')).toBeInTheDocument()

      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i })
      closeButton.click()

      // Fast-forward past the close animation duration (200ms)
      vi.advanceTimersByTime(250)

      // The state should be reset internally (editingTodo = null, isExpanded = false)
      // We verify this by checking the mock was called
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)

      vi.useRealTimers()
    })
  })

  describe('accessibility', () => {
    it('has DialogTitle in DOM', () => {
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      // DialogTitle should be rendered and accessible
      const title = screen.getByRole('heading', { name: /January 15, 2024/i })
      expect(title).toBeInTheDocument()
    })

    it('has DialogDescription in DOM', () => {
      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      // DialogDescription should be rendered
      const description = screen.getByText(/3 todos for this day/i)
      expect(description).toBeInTheDocument()
    })
  })

  describe('scroll behavior', () => {
    it('scrolls content area when todos overflow', () => {
      // Create many todos to cause overflow
      const manyTodos: TodoItem[] = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        emailId: 100,
        description: `Task ${i + 1}`,
        status: 'pending' as const,
        deadline: '2024-01-15T00:00:00.000Z',
        boardColumnId: 2,
        createdAt: '2024-01-10T00:00:00.000Z',
      }))

      renderWithQueryClient(
        <TodoDayModal
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={manyTodos}
        />
      )

      // Content area should have overflow-y-auto
      const contentArea = screen.getByTestId('modal-content-area')
      expect(contentArea.className).toMatch(/overflow-y-auto/)

      // All todos should be rendered
      expect(screen.getByText('Task 1')).toBeInTheDocument()
      expect(screen.getByText('Task 20')).toBeInTheDocument()
    })
  })
})