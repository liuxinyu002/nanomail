import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodoDayDrawer } from './TodoDayDrawer'
import type { TodoItem } from '@/services'

// Mock the mutations hooks
const mockDeleteMutate = vi.fn()
const mockUpdateMutate = vi.fn()
vi.mock('@/hooks/useTodoMutations', () => ({
  useDeleteTodoMutation: () => ({ mutate: mockDeleteMutate }),
  useUpdateTodoMutation: () => ({ mutate: mockUpdateMutate }),
}))

describe('TodoDayDrawer', () => {
  const mockDate = new Date(2024, 0, 15) // January 15, 2024

  const mockTodos: TodoItem[] = [
    {
      id: 1,
      emailId: 100,
      description: 'Low priority task',
      urgency: 'low',
      status: 'pending',
      deadline: '2024-01-15T00:00:00.000Z',
      createdAt: '2024-01-10T00:00:00.000Z',
    },
    {
      id: 2,
      emailId: 100,
      description: 'High priority task',
      urgency: 'high',
      status: 'pending',
      deadline: '2024-01-15T00:00:00.000Z',
      createdAt: '2024-01-10T00:00:00.000Z',
    },
    {
      id: 3,
      emailId: 100,
      description: 'Medium priority task',
      urgency: 'medium',
      status: 'pending',
      deadline: '2024-01-15T00:00:00.000Z',
      createdAt: '2024-01-10T00:00:00.000Z',
    },
  ]

  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    mockDeleteMutate.mockClear()
    mockUpdateMutate.mockClear()
    mockOnOpenChange.mockClear()
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
        <TodoDayDrawer
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
        <TodoDayDrawer
          open={true}
          onOpenChange={mockOnOpenChange}
          date={null}
          todos={[]}
        />
      )

      expect(screen.getByText('Select a date')).toBeInTheDocument()
    })

    it('displays empty state when no todos', () => {
      renderWithQueryClient(
        <TodoDayDrawer
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={[]}
        />
      )

      expect(screen.getByText(/no tasks for this day/i)).toBeInTheDocument()
    })

    it('displays all todos', () => {
      renderWithQueryClient(
        <TodoDayDrawer
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      expect(screen.getByText('High priority task')).toBeInTheDocument()
      expect(screen.getByText('Medium priority task')).toBeInTheDocument()
      expect(screen.getByText('Low priority task')).toBeInTheDocument()
    })
  })

  describe('priority sorting', () => {
    it('displays todos sorted by priority (high first)', () => {
      renderWithQueryClient(
        <TodoDayDrawer
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={mockTodos}
        />
      )

      const todoItems = screen.getAllByRole('listitem')
      expect(todoItems[0]).toHaveTextContent('High priority task')
      expect(todoItems[1]).toHaveTextContent('Medium priority task')
      expect(todoItems[2]).toHaveTextContent('Low priority task')
    })
  })

  describe('edit functionality', () => {
    it('shows edit form when edit is clicked', async () => {
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayDrawer
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
        <TodoDayDrawer
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
        expect(screen.getByText('Low priority task')).toBeInTheDocument()
      })
    })
  })

  describe('delete functionality', () => {
    it('shows inline delete confirmation when delete is clicked', async () => {
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayDrawer
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
        <TodoDayDrawer
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

    it('cancels delete when cancel is clicked in confirmation', async () => {
      const user = userEvent.setup()
      renderWithQueryClient(
        <TodoDayDrawer
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

      // Wait for confirmation options
      await waitFor(() => {
        expect(screen.getByText('Yes, delete')).toBeInTheDocument()
      })

      // Find all Cancel items (menu has Cancel in confirmation)
      const cancelItems = screen.getAllByText('Cancel')
      // Click the last one (in the confirmation menu)
      await user.click(cancelItems[cancelItems.length - 1])

      // Should not have called mutate
      expect(mockDeleteMutate).not.toHaveBeenCalled()
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
        <TodoDayDrawer
          open={true}
          onOpenChange={mockOnOpenChange}
          date={mockDate}
          todos={completedTodos}
        />
      )

      const description = screen.getByText('Low priority task')
      expect(description).toHaveClass('line-through')
    })
  })
})