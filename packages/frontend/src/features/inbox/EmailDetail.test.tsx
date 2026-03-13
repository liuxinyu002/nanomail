import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { EmailDetail, type EmailDetailProps } from './EmailDetail'

// Mock the entire services module
const mockGetTodos = vi.fn()
const mockUpdateTodoStatus = vi.fn()

vi.mock('@/services', () => ({
  TodoService: {
    getTodos: () => mockGetTodos(),
    updateTodoStatus: (id: number, status: string) => mockUpdateTodoStatus(id, status),
  },
}))

describe('EmailDetail', () => {
  const mockEmail: EmailDetailProps['email'] = {
    id: 1,
    subject: 'Test Email',
    sender: 'test@example.com',
    snippet: 'Test snippet',
    bodyText: 'Full email body text',
    date: new Date('2024-01-15'),
    isProcessed: true,
    classification: 'IMPORTANT',
    summary: 'This is a summary of the email content.',
  }

  const mockTodos = [
    { id: 1, emailId: 1, description: 'Reply to the email', urgency: 'high' as const, status: 'pending' as const, deadline: null, createdAt: '2024-01-15T10:00:00.000Z' },
    { id: 2, emailId: 1, description: 'Schedule a meeting', urgency: 'medium' as const, status: 'pending' as const, deadline: null, createdAt: '2024-01-15T10:00:00.000Z' },
  ]

  beforeEach(() => {
    mockGetTodos.mockReset()
    mockUpdateTodoStatus.mockReset()
  })

  describe('Rendering', () => {
    it('should not render for unprocessed emails', () => {
      const unprocessedEmail = { ...mockEmail, isProcessed: false }
      const { container } = render(<EmailDetail email={unprocessedEmail} />)

      expect(container.firstChild).toBeNull()
    })

    it('should render collapsed by default for processed emails', () => {
      render(<EmailDetail email={mockEmail} />)

      expect(screen.getByRole('button', { name: /show details/i })).toBeInTheDocument()
    })

    it('should expand when button is clicked', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

      render(<EmailDetail email={mockEmail} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /show details/i }))
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /hide details/i })).toBeInTheDocument()
      })
    })
  })

  describe('Summary Display', () => {
    it('should display summary when expanded', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: [] })

      render(<EmailDetail email={mockEmail} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /show details/i }))
      })

      await waitFor(() => {
        expect(screen.getByText('Summary')).toBeInTheDocument()
        expect(screen.getByText('This is a summary of the email content.')).toBeInTheDocument()
      })
    })

    it('should show placeholder if no summary', async () => {
      const emailNoSummary = { ...mockEmail, summary: null }
      mockGetTodos.mockResolvedValueOnce({ todos: [] })

      render(<EmailDetail email={emailNoSummary} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /show details/i }))
      })

      await waitFor(() => {
        expect(screen.getByText('No summary available')).toBeInTheDocument()
      })
    })
  })

  describe('Todo List', () => {
    it('should fetch todos when expanded', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

      render(<EmailDetail email={mockEmail} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /show details/i }))
      })

      await waitFor(() => {
        expect(mockGetTodos).toHaveBeenCalled()
      })
    })

    it('should display action items header when todos exist', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

      render(<EmailDetail email={mockEmail} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /show details/i }))
      })

      await waitFor(() => {
        expect(screen.getByText('Action Items')).toBeInTheDocument()
      })
    })

    it('should display todo descriptions', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

      render(<EmailDetail email={mockEmail} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /show details/i }))
      })

      await waitFor(() => {
        expect(screen.getByText('Reply to the email')).toBeInTheDocument()
        expect(screen.getByText('Schedule a meeting')).toBeInTheDocument()
      })
    })

    it('should show urgency indicators', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

      render(<EmailDetail email={mockEmail} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /show details/i }))
      })

      await waitFor(() => {
        expect(screen.getByText('high')).toBeInTheDocument()
        expect(screen.getByText('medium')).toBeInTheDocument()
      })
    })
  })

  describe('Toggle Todo Completion', () => {
    it('should show checkbox for each todo', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })

      render(<EmailDetail email={mockEmail} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /show details/i }))
      })

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox')
        expect(checkboxes).toHaveLength(2)
      })
    })

    it('should show completed checkbox for completed todos', async () => {
      const completedTodos = [
        { ...mockTodos[0], status: 'completed' as const },
      ]
      mockGetTodos.mockResolvedValueOnce({ todos: completedTodos })

      render(<EmailDetail email={mockEmail} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /show details/i }))
      })

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox')
        expect(checkbox).toBeChecked()
      })
    })

    it('should toggle todo status when checkbox is clicked', async () => {
      mockGetTodos.mockResolvedValueOnce({ todos: mockTodos })
      mockUpdateTodoStatus.mockResolvedValueOnce({
        ...mockTodos[0],
        status: 'completed',
        createdAt: mockTodos[0].createdAt,
        deadline: null,
      })

      render(<EmailDetail email={mockEmail} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /show details/i }))
      })

      const checkbox = await screen.findByRole('checkbox', { name: /reply to the email/i })

      await act(async () => {
        fireEvent.click(checkbox)
      })

      await waitFor(() => {
        expect(mockUpdateTodoStatus).toHaveBeenCalledWith(1, 'completed')
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner while fetching todos', async () => {
      mockGetTodos.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<EmailDetail email={mockEmail} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /show details/i }))
      })

      await waitFor(() => {
        expect(screen.getByTestId('loading-todos')).toBeInTheDocument()
      })
    })
  })
})