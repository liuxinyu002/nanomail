import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodosPage } from './TodosPage'
import type { Todo, BoardColumn } from '@nanomail/shared'

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

// Create mutable state for mock hooks
let mockTodosData: { todos: Todo[] } | undefined = undefined
let mockColumnsData: { columns: BoardColumn[] } | undefined = undefined
let mockIsLoading = false
let mockError: Error | null = null

vi.mock('@/hooks', () => ({
  useTodos: () => ({
    data: mockTodosData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
  useBoardColumns: () => ({
    data: mockColumnsData,
    isLoading: false,
    error: null,
  }),
  useUpdateTodoMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useCreateBoardColumnMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteBoardColumnMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateBoardColumnMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

// Mock panel components
vi.mock('@/features/todos/InboxPanel', () => ({
  InboxPanel: ({ className }: { className?: string }) => (
    <div data-testid="inbox-panel" className={className}>Inbox Panel</div>
  ),
}))

vi.mock('@/features/todos/PlannerPanel', () => ({
  PlannerPanel: ({ className }: { className?: string }) => (
    <div data-testid="planner-panel" className={className}>Planner Panel</div>
  ),
}))

vi.mock('@/features/todos/BoardPanel', () => ({
  BoardPanel: ({ className, onCreateColumn, onDeleteColumn, onUpdateColumn }: { className?: string; onCreateColumn?: (name: string, order: number) => void; onDeleteColumn?: (columnId: number) => void; onUpdateColumn?: (columnId: number, data: { name?: string; color?: string | null }) => void }) => (
    <div data-testid="board-panel" className={className} data-has-on-create={!!onCreateColumn} data-has-on-delete={!!onDeleteColumn} data-has-on-update={!!onUpdateColumn}>Board Panel</div>
  ),
}))

// Mock ViewToggle
vi.mock('@/features/todos/ViewToggle', () => ({
  ViewToggle: ({ activeViews, onToggle, className }: { activeViews: string[]; onToggle: (view: string) => void; className?: string }) => (
    <div data-testid="view-toggle" className={className}>
      <button onClick={() => onToggle('inbox')} data-active={activeViews.includes('inbox')}>
        Inbox
      </button>
      <button onClick={() => onToggle('planner')} data-active={activeViews.includes('planner')}>
        Planner
      </button>
      <button onClick={() => onToggle('board')} data-active={activeViews.includes('board')}>
        Board
      </button>
    </div>
  ),
}))

// Mock ResizablePanels
vi.mock('@/features/todos/ResizablePanels', () => ({
  ResizablePanels: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="resizable-panels" className={className}>
      {children}
    </div>
  ),
}))

describe('TodosPage (Refactored)', () => {
  const mockColumns: BoardColumn[] = [
    { id: 1, name: 'Inbox', color: '#6B7280', order: 0, isSystem: true, createdAt: new Date('2024-01-01') },
    { id: 2, name: 'Todo', color: '#3B82F6', order: 1, isSystem: false, createdAt: new Date('2024-01-01') },
    { id: 3, name: 'In Progress', color: '#F59E0B', order: 2, isSystem: false, createdAt: new Date('2024-01-01') },
    { id: 4, name: 'Done', color: '#10B981', order: 3, isSystem: false, createdAt: new Date('2024-01-01') },
  ]

  const mockTodos: Todo[] = [
    {
      id: 1,
      emailId: 100,
      description: 'Inbox task',
      status: 'pending',
      deadline: null,
      boardColumnId: 1,
      position: 0,
      createdAt: new Date('2024-01-15T10:00:00.000Z'),
    },
    {
      id: 2,
      emailId: 101,
      description: 'Todo task',
      status: 'pending',
      deadline: null,
      boardColumnId: 2,
      position: 0,
      createdAt: new Date('2024-01-15T11:00:00.000Z'),
    },
    {
      id: 3,
      emailId: 102,
      description: 'Scheduled task',
      status: 'pending',
      deadline: '2024-12-31T23:59:59.000Z',
      boardColumnId: 1,
      position: 1,
      createdAt: new Date('2024-01-15T12:00:00.000Z'),
    },
  ]

  beforeEach(() => {
    mockGetTodos.mockReset()
    mockTodosData = undefined
    mockColumnsData = { columns: mockColumns }
    mockIsLoading = false
    mockError = null
  })

  describe('Initial Load', () => {
    it('should show loading state initially', () => {
      mockIsLoading = true

      render(<TodosPage />)

      expect(screen.getByTestId('loading-todos')).toBeInTheDocument()
    })

    it('should render page without title', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /to-do/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Three-Panel Layout', () => {
    it('should render inbox and board panels by default (planner hidden)', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByTestId('inbox-panel')).toBeInTheDocument()
        expect(screen.queryByTestId('planner-panel')).not.toBeInTheDocument()
        expect(screen.getByTestId('board-panel')).toBeInTheDocument()
      })
    })

    it('should render ViewToggle component', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByTestId('view-toggle')).toBeInTheDocument()
      })
    })

    it('should render panels in a container with overflow hidden', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        const panelContainer = screen.getByTestId('panels-container')
        expect(panelContainer).toHaveClass('flex-1')
        expect(panelContainer).toHaveClass('overflow-hidden')
      })
    })

    it('should render ResizablePanels component', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByTestId('resizable-panels')).toBeInTheDocument()
      })
    })
  })

  describe('ViewToggle Integration', () => {
    it('should show inbox and board panels by default (planner hidden)', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByTestId('inbox-panel')).toBeInTheDocument()
        expect(screen.queryByTestId('planner-panel')).not.toBeInTheDocument()
        expect(screen.getByTestId('board-panel')).toBeInTheDocument()
      })
    })

    it('should show planner when Planner is toggled on', async () => {
      const user = userEvent.setup()
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByTestId('view-toggle')).toBeInTheDocument()
      })

      // Toggle on Planner
      const plannerButton = screen.getByRole('button', { name: 'Planner' })
      await user.click(plannerButton)

      await waitFor(() => {
        expect(screen.getByTestId('inbox-panel')).toBeInTheDocument()
        expect(screen.getByTestId('planner-panel')).toBeInTheDocument()
        expect(screen.getByTestId('board-panel')).toBeInTheDocument()
      })
    })

    it('should hide Inbox panel when Inbox is togg off', async () => {
      const user = userEvent.setup()
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByTestId('view-toggle')).toBeInTheDocument()
      })

      // Toggle off Inbox
      const inboxButton = screen.getByRole('button', { name: 'Inbox' })
      await user.click(inboxButton)

      await waitFor(() => {
        expect(screen.queryByTestId('inbox-panel')).not.toBeInTheDocument()
        expect(screen.queryByTestId('planner-panel')).not.toBeInTheDocument()
        expect(screen.getByTestId('board-panel')).toBeInTheDocument()
      })
    })

    it('should hide Board panel when Board is toggled off', async () => {
      const user = userEvent.setup()
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByTestId('view-toggle')).toBeInTheDocument()
      })

      // Toggle off Board
      const boardButton = screen.getByRole('button', { name: 'Board' })
      await user.click(boardButton)

      await waitFor(() => {
        expect(screen.getByTestId('inbox-panel')).toBeInTheDocument()
        expect(screen.queryByTestId('planner-panel')).not.toBeInTheDocument()
        expect(screen.queryByTestId('board-panel')).not.toBeInTheDocument()
      })
    })

    it('should prevent deselecting the last active view', async () => {
      const user = userEvent.setup()
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByTestId('view-toggle')).toBeInTheDocument()
      })

      // Toggle off Inbox to leave only Board active
      await user.click(screen.getByRole('button', { name: 'Inbox' }))

      await waitFor(() => {
        expect(screen.getByTestId('board-panel')).toBeInTheDocument()
        expect(screen.queryByTestId('inbox-panel')).not.toBeInTheDocument()
      })

      // Try to toggle off the last view (Board)
      await user.click(screen.getByRole('button', { name: 'Board' }))

      // Board should still be visible (can't deselect last view)
      await waitFor(() => {
        expect(screen.getByTestId('board-panel')).toBeInTheDocument()
      })
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

  describe('Empty State', () => {
    it('should show empty state when no todos', async () => {
      mockTodosData = { todos: [] }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.getByText(/no action items/i)).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Layout', () => {
    it('should have proper responsive classes on panels container', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        const container = screen.getByTestId('panels-container')
        expect(container).toHaveClass('flex-1')
        expect(container).toHaveClass('overflow-hidden')
      })
    })
  })

  describe('No Tabs (Removed)', () => {
    it('should NOT render Tabs component', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.queryByRole('tab')).not.toBeInTheDocument()
      })
    })

    it('should NOT have List/Calendar tabs', async () => {
      mockTodosData = { todos: mockTodos }

      render(<TodosPage />)

      await waitFor(() => {
        expect(screen.queryByRole('tab', { name: /list/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('tab', { name: /calendar/i })).not.toBeInTheDocument()
      })
    })
  })
})