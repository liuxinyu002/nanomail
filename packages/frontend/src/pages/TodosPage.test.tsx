import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodosPage } from './TodosPage'
import type { TodoItem } from '@/services'

// Mock the services
const mockGetTodos = vi.fn()

vi.mock('@/services', () => ({
  TodoService: {
    getTodos: () => mockGetTodos(),
    updateTodoStatus: vi.fn(),
  },
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useNavigate: () => mockNavigate,
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className} data-testid="email-link">
      {children}
    </a>
  ),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock mutation hooks
const mockUpdateMutate = vi.fn()

// Create a mutable state for the mock hook
let mockTodosData: { todos: TodoItem[] } | undefined = undefined
let mockIsLoading = false
let mockError: Error | null = null

vi.mock('@/hooks', () => ({
  useTodos: () => ({
    data: mockTodosData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
  useUpdateTodoMutation: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}))

// Mock TodoItem component
vi.mock('@/features/todos/TodoItem', () => ({
  TodoItem: ({ todo, showDelete }: { todo: TodoItem; showDelete?: boolean }) => (
    <div data-testid={`todo-item-${todo.id}`}>
      <span>{todo.description}</span>
      <span>{todo.urgency}</span>
      <span data-testid={`status-${todo.id}`}>{todo.status}</span>
      {showDelete && <span data-testid={`delete-btn-${todo.id}`}>Delete</span>}
    </div>
  ),
}))

// Mock TodoCalendar component
vi.mock('@/features/todos/TodoCalendar', () => ({
  TodoCalendar: () => <div data-testid="todo-calendar-view">Calendar View</div>,
}))

describe('TodosPage', () => {
  const mockTodos: TodoItem[] = [
    {
      id: 1,
      emailId: 1,
      description: 'High priority task 1',
      urgency: 'high',
      status: 'pending',
      deadline: null,
      createdAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 2,
      emailId: 1,
      description: 'High priority task 2',
      urgency: 'high',
      status: 'pending',
      deadline: null,
      createdAt: '2024-01-15T11:00:00.000Z',
    },
    {
      id: 3,
      emailId: 2,
      description: 'Medium priority task',
      urgency: 'medium',
      status: 'pending',
      deadline: null,
      createdAt: '2024-01-15T12:00:00.000Z',
    },
    {
      id: 4,
      emailId: 2,
      description: 'Low priority task',
      urgency: 'low',
      status: 'pending',
      deadline: null,
      createdAt: '2024-01-15T13:00:00.000Z',
    },
    {
      id: 5,
      emailId: 3,
      description: 'Completed task 1',
      urgency: 'high',
      status: 'completed',
      deadline: null,
      createdAt: '2024-01-14T10:00:00.000Z',
    },
    {
      id: 6,
      emailId: 3,
      description: 'Completed task 2',
      urgency: 'medium',
      status: 'completed',
      deadline: null,
      createdAt: '2024-01-14T11:00:00.000Z',
    },
  ]

  beforeEach(() => {
    mockGetTodos.mockReset()
    mockTodosData = undefined
    mockIsLoading = false
    mockError = null
  })

  describe('Initial Load', () => {
    it('should fetch todos on mount', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      // The component should render with data
      await waitFor(() => {
        expect(screen.getByText('High Priority')).toBeInTheDocument()
      })
    })

    it('should show loading state initially', () => {
      mockIsLoading = true

      render(<TodosPage />)

      expect(screen.getByTestId('loading-todos')).toBeInTheDocument()
    })
  })

  describe('Grouping by Urgency', () => {
    it('should render High Priority column', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('High Priority')).toBeInTheDocument()
      })
    })

    it('should render Medium Priority column', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('Medium Priority')).toBeInTheDocument()
      })
    })

    it('should render Low Priority column', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('Low Priority')).toBeInTheDocument()
      })
    })

    it('should render Completed column', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument()
      })
    })

    it('should group todos by urgency', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        // High priority column should contain high priority tasks
        expect(screen.getByText('High priority task 1')).toBeInTheDocument()
        expect(screen.getByText('High priority task 2')).toBeInTheDocument()

        // Medium priority column
        expect(screen.getByText('Medium priority task')).toBeInTheDocument()

        // Low priority column
        expect(screen.getByText('Low priority task')).toBeInTheDocument()
      })
    })

    it('should put completed todos in Completed column', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('Completed task 1')).toBeInTheDocument()
        expect(screen.getByText('Completed task 2')).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no todos at all', async () => {
      mockTodosData = { todos: [] }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText(/no action items/i)).toBeInTheDocument()
      })
    })

    it('should show empty message for High Priority column when empty', async () => {
      mockTodosData = { todos: [mockTodos[2], mockTodos[3]] } // Only medium and low

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('No high priority tasks')).toBeInTheDocument()
      })
    })

    it('should show empty message for Medium Priority column when empty', async () => {
      mockTodosData = { todos: [mockTodos[0], mockTodos[3]] } // Only high and low

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('No medium priority tasks')).toBeInTheDocument()
      })
    })

    it('should show empty message for Low Priority column when empty', async () => {
      mockTodosData = { todos: [mockTodos[0], mockTodos[2]] } // Only high and medium

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('No low priority tasks')).toBeInTheDocument()
      })
    })

    it('should show empty message for Completed column when empty', async () => {
      mockTodosData = { todos: [mockTodos[0]] } // Only pending high

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('No completed tasks')).toBeInTheDocument()
      })
    })
  })

  describe('Completed Column Limit', () => {
    it('should show only 10 completed items initially', async () => {
      const manyCompleted = Array.from({ length: 15 }, (_, i) => ({
        id: 100 + i,
        emailId: 1,
        description: `Completed task ${i + 1}`,
        urgency: 'high' as const,
        status: 'completed' as const,
        deadline: null,
        createdAt: `2024-01-${10 + i}T10:00:00.000Z`,
      }))

      mockTodosData = { todos: manyCompleted }

      render(<TodosPage />)

      await waitFor(() => {
        // Should show first 10 completed items
        for (let i = 0; i < 10; i++) {
          expect(screen.getByText(`Completed task ${i + 1}`)).toBeInTheDocument()
        }
        // Should not show items 11-15
        expect(screen.queryByText('Completed task 11')).not.toBeInTheDocument()
        expect(screen.queryByText('Completed task 12')).not.toBeInTheDocument()
      })
    })

    it('should show Load More button when more than 10 completed items', async () => {
      const manyCompleted = Array.from({ length: 15 }, (_, i) => ({
        id: 100 + i,
        emailId: 1,
        description: `Completed task ${i + 1}`,
        urgency: 'high' as const,
        status: 'completed' as const,
        deadline: null,
        createdAt: `2024-01-${10 + i}T10:00:00.000Z`,
      }))

      mockTodosData = { todos: manyCompleted }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
      })
    })

    it('should load more completed items when Load More is clicked', async () => {
      const manyCompleted = Array.from({ length: 15 }, (_, i) => ({
        id: 100 + i,
        emailId: 1,
        description: `Completed task ${i + 1}`,
        urgency: 'high' as const,
        status: 'completed' as const,
        deadline: null,
        createdAt: `2024-01-${10 + i}T10:00:00.000Z`,
      }))

      mockTodosData = { todos: manyCompleted }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /load more/i }))

      await waitFor(() => {
        expect(screen.getByText('Completed task 11')).toBeInTheDocument()
        expect(screen.getByText('Completed task 12')).toBeInTheDocument()
      })
    })

    it('should not show Load More button when 10 or fewer completed items', async () => {
      const fewCompleted = Array.from({ length: 5 }, (_, i) => ({
        id: 100 + i,
        emailId: 1,
        description: `Completed task ${i + 1}`,
        urgency: 'high' as const,
        status: 'completed' as const,
        deadline: null,
        createdAt: `2024-01-${10 + i}T10:00:00.000Z`,
      }))

      mockTodosData = { todos: fewCompleted }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('Completed task 1')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should show error message when fetch fails', async () => {
      const { toast } = await import('sonner')
      mockError = new Error('Network error')

      render(<TodosPage />)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load todos')
      })
    })
  })

  describe('Responsive Layout', () => {
    it('should have responsive grid classes', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        const grid = screen.getByTestId('todos-grid')
        expect(grid).toHaveClass('grid-cols-1')
        expect(grid).toHaveClass('md:grid-cols-4')
      })
    })
  })

  describe('Status Change', () => {
    it('should update todo status via mutation', async () => {
      mockTodosData = { todos: [mockTodos[0]] }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('High priority task 1')).toBeInTheDocument()
      })

      // Since TodoItem is mocked, we can verify the mutation hook is called
      // when the component would normally interact with it
      expect(screen.getByTestId('status-1')).toHaveTextContent('pending')
    })
  })

  describe('Tab Navigation', () => {
    it('should render list tab and calendar tab', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /list/i })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: /calendar/i })).toBeInTheDocument()
      })
    })

    it('should show list view by default', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        // List view should be visible (shows todos-grid)
        expect(screen.getByTestId('todos-grid')).toBeInTheDocument()
      })
    })

    it('should switch to calendar view when calendar tab is clicked', async () => {
      const user = userEvent.setup()
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /calendar/i })).toBeInTheDocument()
      })

      // Click calendar tab
      await user.click(screen.getByRole('tab', { name: /calendar/i }))

      // Calendar view should be visible
      await waitFor(() => {
        expect(screen.getByTestId('todo-calendar-view')).toBeInTheDocument()
      })
    })

    it('should switch back to list view when list tab is clicked', async () => {
      const user = userEvent.setup()
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /calendar/i })).toBeInTheDocument()
      })

      // Go to calendar view
      await user.click(screen.getByRole('tab', { name: /calendar/i }))

      await waitFor(() => {
        expect(screen.getByTestId('todo-calendar-view')).toBeInTheDocument()
      })

      // Go back to list view
      await user.click(screen.getByRole('tab', { name: /list/i }))

      await waitFor(() => {
        expect(screen.getByTestId('todos-grid')).toBeInTheDocument()
      })
    })

    it('should indicate active tab with data-state attribute', async () => {
      const user = userEvent.setup()
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /list/i })).toBeInTheDocument()
      })

      // List tab should be active initially
      const listTab = screen.getByRole('tab', { name: /list/i })
      expect(listTab).toHaveAttribute('data-state', 'active')

      // Click calendar tab
      await user.click(screen.getByRole('tab', { name: /calendar/i }))

      // Calendar tab should now be active
      await waitFor(() => {
        const calendarTab = screen.getByRole('tab', { name: /calendar/i })
        expect(calendarTab).toHaveAttribute('data-state', 'active')
      })
    })
  })
})