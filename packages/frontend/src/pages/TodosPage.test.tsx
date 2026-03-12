import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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

// Mock TodoItem component
vi.mock('@/features/todos/TodoItem', () => ({
  TodoItem: ({ todo, onStatusChange }: { todo: TodoItem; onStatusChange: (todo: TodoItem) => void }) => (
    <div data-testid={`todo-item-${todo.id}`}>
      <span>{todo.description}</span>
      <span>{todo.urgency}</span>
      <span data-testid={`status-${todo.id}`}>{todo.status}</span>
      <button
        onClick={() => onStatusChange({ ...todo, status: todo.status === 'completed' ? 'pending' : 'completed' })}
        data-testid={`toggle-${todo.id}`}
      >
        Toggle
      </button>
    </div>
  ),
}))

describe('TodosPage', () => {
  const mockTodos: TodoItem[] = [
    {
      id: 1,
      emailId: 1,
      description: 'High priority task 1',
      urgency: 'high',
      status: 'pending',
      createdAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 2,
      emailId: 1,
      description: 'High priority task 2',
      urgency: 'high',
      status: 'pending',
      createdAt: '2024-01-15T11:00:00.000Z',
    },
    {
      id: 3,
      emailId: 2,
      description: 'Medium priority task',
      urgency: 'medium',
      status: 'pending',
      createdAt: '2024-01-15T12:00:00.000Z',
    },
    {
      id: 4,
      emailId: 2,
      description: 'Low priority task',
      urgency: 'low',
      status: 'pending',
      createdAt: '2024-01-15T13:00:00.000Z',
    },
    {
      id: 5,
      emailId: 3,
      description: 'Completed task 1',
      urgency: 'high',
      status: 'completed',
      createdAt: '2024-01-14T10:00:00.000Z',
    },
    {
      id: 6,
      emailId: 3,
      description: 'Completed task 2',
      urgency: 'medium',
      status: 'completed',
      createdAt: '2024-01-14T11:00:00.000Z',
    },
  ]

  beforeEach(() => {
    mockGetTodos.mockReset()
  })

  describe('Initial Load', () => {
    it('should fetch todos on mount', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

      render(<TodosPage />)

      await waitFor(() => {
        expect(mockGetTodos).toHaveBeenCalled()
      })
    })

    it('should show loading state initially', () => {
      mockGetTodos.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<TodosPage />)

      expect(screen.getByTestId('loading-todos')).toBeInTheDocument()
    })
  })

  describe('Grouping by Urgency', () => {
    it('should render High Priority column', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('High Priority')).toBeInTheDocument()
      })
    })

    it('should render Medium Priority column', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('Medium Priority')).toBeInTheDocument()
      })
    })

    it('should render Low Priority column', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('Low Priority')).toBeInTheDocument()
      })
    })

    it('should render Completed column', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument()
      })
    })

    it('should group todos by urgency', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

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
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('Completed task 1')).toBeInTheDocument()
        expect(screen.getByText('Completed task 2')).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no todos at all', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: [] })

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText(/no action items/i)).toBeInTheDocument()
      })
    })

    it('should show empty message for High Priority column when empty', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: [mockTodos[2], mockTodos[3]] }) // Only medium and low

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('No high priority tasks')).toBeInTheDocument()
      })
    })

    it('should show empty message for Medium Priority column when empty', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: [mockTodos[0], mockTodos[3]] }) // Only high and low

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('No medium priority tasks')).toBeInTheDocument()
      })
    })

    it('should show empty message for Low Priority column when empty', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: [mockTodos[0], mockTodos[2]] }) // Only high and medium

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('No low priority tasks')).toBeInTheDocument()
      })
    })

    it('should show empty message for Completed column when empty', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: [mockTodos[0]] }) // Only pending high

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
        createdAt: `2024-01-${10 + i}T10:00:00.000Z`,
      }))

      mockGetTodos.mockResolvedValueOnce({ todos: manyCompleted })

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
        createdAt: `2024-01-${10 + i}T10:00:00.000Z`,
      }))

      mockGetTodos.mockResolvedValueOnce({ todos: manyCompleted })

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
        createdAt: `2024-01-${10 + i}T10:00:00.000Z`,
      }))

      mockGetTodos.mockResolvedValueOnce({ todos: manyCompleted })

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
        createdAt: `2024-01-${10 + i}T10:00:00.000Z`,
      }))

      mockGetTodos.mockResolvedValueOnce({ todos: fewCompleted })

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
      mockGetTodos.mockRejectedValueOnce(new Error('Network error'))

      render(<TodosPage />)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load todos')
      })
    })
  })

  describe('Responsive Layout', () => {
    it('should have responsive grid classes', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

      render(<TodosPage />)

      await waitFor(() => {
        const grid = screen.getByTestId('todos-grid')
        expect(grid).toHaveClass('grid-cols-1')
        expect(grid).toHaveClass('md:grid-cols-4')
      })
    })
  })

  describe('Status Change', () => {
    it('should update todo status optimistically', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: [mockTodos[0]] })

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText('High priority task 1')).toBeInTheDocument()
      })

      // Click toggle button
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-1'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('status-1')).toHaveTextContent('completed')
      })
    })
  })
})