import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodoCalendar, type TodoCalendarProps } from './TodoCalendar'
import type { TodoItem } from '@/services'

// Mock useTodosByDateRange hook
const mockData = {
  todos: [
    {
      id: 1,
      emailId: 100,
      description: 'Test todo',
      status: 'pending' as const,
      boardColumnId: 2,
      deadline: '2024-03-15T12:00:00.000Z',
      createdAt: '2024-03-01T10:00:00.000Z',
    },
  ] as TodoItem[],
}

let mockIsLoading = false
let mockQueryData = mockData

vi.mock('@/hooks', () => ({
  useTodosByDateRange: () => ({
    data: mockQueryData,
    isLoading: mockIsLoading,
  }),
}))

// Mock TodoCalendarGrid
vi.mock('./TodoCalendarGrid', () => ({
  TodoCalendarGrid: ({ currentMonth, todos, onDayClick }: {
    currentMonth: Date
    todos: TodoItem[]
    onDayClick: (date: Date, todos: TodoItem[]) => void
  }) => (
    <div data-testid="calendar-grid" data-month={currentMonth.toISOString()}>
      <div data-testid="todos-count">{todos.length}</div>
      <button
        data-testid="day-click-trigger"
        onClick={() => onDayClick(new Date('2024-03-15'), todos)}
      >
        Click Day
      </button>
    </div>
  ),
}))

// Mock TodoDayModal - Phase 3: Replaced TodoDayDrawer
vi.mock('./TodoDayModal', () => ({
  TodoDayModal: ({ open, date, todos }: {
    open: boolean
    date: Date | null
    todos: TodoItem[]
  }) => (
    <div data-testid="day-modal" data-open={open}>
      {open && (
        <>
          <span data-testid="modal-date">{date?.toISOString()}</span>
          <span data-testid="modal-todos-count">{todos.length}</span>
        </>
      )}
    </div>
  ),
}))

// Helper to create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('TodoCalendar', () => {
  const defaultProps: TodoCalendarProps = {}

  beforeEach(() => {
    mockIsLoading = false
    mockQueryData = mockData
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the calendar container', () => {
      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByTestId('todo-calendar')).toBeInTheDocument()
    })

    it('should render TodoCalendarGrid', () => {
      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument()
    })

    it('should render TodoDayModal', () => {
      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByTestId('day-modal')).toBeInTheDocument()
    })
  })

  describe('Month Navigation', () => {
    it('should display current month title', () => {
      // Render with March 2024
      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      // The title should contain the month name
      const title = screen.getByRole('heading', { level: 2 })
      expect(title).toBeInTheDocument()
    })

    it('should render previous month button', () => {
      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      const prevButton = screen.getByLabelText(/previous month/i)
      expect(prevButton).toBeInTheDocument()
    })

    it('should render next month button', () => {
      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      const nextButton = screen.getByLabelText(/next month/i)
      expect(nextButton).toBeInTheDocument()
    })

    it('should navigate to previous month when prev button is clicked', async () => {
      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      const grid = screen.getByTestId('calendar-grid')
      const initialMonth = grid.getAttribute('data-month')

      const prevButton = screen.getByLabelText(/previous month/i)
      fireEvent.click(prevButton)

      await waitFor(() => {
        const newMonth = grid.getAttribute('data-month')
        expect(newMonth).not.toBe(initialMonth)
      })
    })

    it('should navigate to next month when next button is clicked', async () => {
      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      const grid = screen.getByTestId('calendar-grid')
      const initialMonth = grid.getAttribute('data-month')

      const nextButton = screen.getByLabelText(/next month/i)
      fireEvent.click(nextButton)

      await waitFor(() => {
        const newMonth = grid.getAttribute('data-month')
        expect(newMonth).not.toBe(initialMonth)
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading state when data is loading', () => {
      mockIsLoading = true

      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should show calendar grid when loading is complete', () => {
      mockIsLoading = false

      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument()
    })
  })

  describe('Modal State Management', () => {
    it('should open modal when day is clicked', async () => {
      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      // Initially modal is closed
      const modal = screen.getByTestId('day-modal')
      expect(modal).toHaveAttribute('data-open', 'false')

      // Click a day
      const dayTrigger = screen.getByTestId('day-click-trigger')
      fireEvent.click(dayTrigger)

      await waitFor(() => {
        expect(modal).toHaveAttribute('data-open', 'true')
      })
    })

    it('should pass selected date and todos to modal', async () => {
      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      // Click a day
      const dayTrigger = screen.getByTestId('day-click-trigger')
      fireEvent.click(dayTrigger)

      await waitFor(() => {
        const modalDate = screen.getByTestId('modal-date')
        expect(modalDate).toBeInTheDocument()

        const todosCount = screen.getByTestId('modal-todos-count')
        expect(todosCount).toBeInTheDocument()
      })
    })
  })

  describe('Data Integration', () => {
    it('should pass todos to TodoCalendarGrid', () => {
      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      const todosCount = screen.getByTestId('todos-count')
      expect(todosCount).toHaveTextContent('1')
    })

    it('should handle empty todos array', () => {
      mockQueryData = { todos: [] }

      render(<TodoCalendar {...defaultProps} />, { wrapper: createWrapper() })

      const todosCount = screen.getByTestId('todos-count')
      expect(todosCount).toHaveTextContent('0')
    })
  })
})