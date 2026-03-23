import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TodoCardWidget } from './TodoCardWidget'
import { todoService } from '@/services/todo.service'
import type { Todo } from '@nanomail/shared'

// Mock the todoService
vi.mock('@/services/todo.service', () => ({
  todoService: {
    update: vi.fn(),
  },
}))

// Helper to create a Todo for testing
function createTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    emailId: null,
    description: 'Test todo description',
    status: 'pending',
    deadline: null,
    boardColumnId: 1,
    color: null,
    source: 'manual',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  }
}

describe('TodoCardWidget', () => {
  const mockTodoService = vi.mocked(todoService)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render the header with Todos label', () => {
      render(<TodoCardWidget todos={[createTodo()]} />)

      expect(screen.getByText('Todos')).toBeInTheDocument()
    })

    it('should render the CheckSquare icon in header', () => {
      const { container } = render(<TodoCardWidget todos={[createTodo()]} />)

      // CheckSquare icon should be present in the header
      const headerIcon = container.querySelector('.text-gray-500')
      expect(headerIcon).toBeInTheDocument()
    })

    it('should render multiple todos', () => {
      const todos = [
        createTodo({ id: 1, description: 'First todo' }),
        createTodo({ id: 2, description: 'Second todo' }),
        createTodo({ id: 3, description: 'Third todo' }),
      ]

      render(<TodoCardWidget todos={todos} />)

      expect(screen.getByText('First todo')).toBeInTheDocument()
      expect(screen.getByText('Second todo')).toBeInTheDocument()
      expect(screen.getByText('Third todo')).toBeInTheDocument()
    })

    it('should have proper container styling', () => {
      const { container } = render(<TodoCardWidget todos={[createTodo()]} />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('border', 'border-gray-200', 'rounded-lg', 'bg-white')
    })
  })

  describe('rendering todo fields', () => {
    it('should display todo description', () => {
      render(<TodoCardWidget todos={[createTodo({ description: 'Buy groceries' })]} />)

      expect(screen.getByText('Buy groceries')).toBeInTheDocument()
    })

    it('should display checkbox for each todo', () => {
      const todos = [
        createTodo({ id: 1 }),
        createTodo({ id: 2 }),
      ]

      render(<TodoCardWidget todos={todos} />)

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(2)
    })

    it('should show checkbox as checked when status is completed', () => {
      render(<TodoCardWidget todos={[createTodo({ status: 'completed' })]} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should show checkbox as unchecked when status is pending', () => {
      render(<TodoCardWidget todos={[createTodo({ status: 'pending' })]} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('should show checkbox as unchecked when status is in_progress', () => {
      render(<TodoCardWidget todos={[createTodo({ status: 'in_progress' })]} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })
  })

  describe('deadline formatting', () => {
    it('should display deadline when provided', () => {
      render(
        <TodoCardWidget
          todos={[createTodo({ deadline: '2024-03-15T14:30:00.000Z' })]}
        />
      )

      // The component uses zh-CN locale with month/day hour:minute format
      // The exact format depends on timezone, but should contain date/time numbers
      expect(screen.getByText(/\d{2}\/\d{2}\s+\d{2}:\d{2}/)).toBeInTheDocument()
    })

    it('should not display deadline when null', () => {
      const { container } = render(
        <TodoCardWidget todos={[createTodo({ deadline: null })]} />
      )

      // Look for the deadline span - it should not exist
      const deadlineSpans = container.querySelectorAll('.text-xs.text-gray-500')
      expect(deadlineSpans).toHaveLength(0)
    })

    it('should format deadline with correct zh-CN format', () => {
      render(
        <TodoCardWidget
          todos={[createTodo({ deadline: '2024-03-15T14:30:00.000Z' })]}
        />
      )

      // Should contain date parts formatted as MM/DD HH:mm (zh-CN locale uses /)
      // Note: exact output depends on timezone, so we check for pattern
      const deadlineText = screen.getByText(/\d{2}\/\d{2}\s+\d{2}:\d{2}/)
      expect(deadlineText).toBeInTheDocument()
    })
  })

  describe('visual states for completed todos', () => {
    it('should apply line-through style to completed todo description', () => {
      const { container } = render(
        <TodoCardWidget todos={[createTodo({ status: 'completed' })]} />
      )

      const descriptionSpan = container.querySelector('.line-through')
      expect(descriptionSpan).toBeInTheDocument()
      expect(descriptionSpan).toHaveTextContent('Test todo description')
    })

    it('should apply gray text color to completed todo description', () => {
      const { container } = render(
        <TodoCardWidget todos={[createTodo({ status: 'completed' })]} />
      )

      const descriptionSpan = container.querySelector('.text-gray-400')
      expect(descriptionSpan).toBeInTheDocument()
    })

    it('should not apply line-through to pending todo', () => {
      const { container } = render(
        <TodoCardWidget todos={[createTodo({ status: 'pending' })]} />
      )

      const descriptionSpan = container.querySelector('.line-through')
      expect(descriptionSpan).not.toBeInTheDocument()
    })

    it('should not apply line-through to in_progress todo', () => {
      const { container } = render(
        <TodoCardWidget todos={[createTodo({ status: 'in_progress' })]} />
      )

      const descriptionSpan = container.querySelector('.line-through')
      expect(descriptionSpan).not.toBeInTheDocument()
    })
  })

  describe('checkbox toggle behavior', () => {
    it('should call todoService.update with completed status when toggling pending todo', async () => {
      const mockOnUpdate = vi.fn()
      mockTodoService.update.mockResolvedValueOnce(createTodo({ status: 'completed' }))

      render(
        <TodoCardWidget
          todos={[createTodo({ id: 1, status: 'pending' })]}
          onUpdate={mockOnUpdate}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(mockTodoService.update).toHaveBeenCalledWith('1', { status: 'completed' })
      })
    })

    it('should call todoService.update with pending status when toggling completed todo', async () => {
      const mockOnUpdate = vi.fn()
      mockTodoService.update.mockResolvedValueOnce(createTodo({ status: 'pending' }))

      render(
        <TodoCardWidget
          todos={[createTodo({ id: 1, status: 'completed' })]}
          onUpdate={mockOnUpdate}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(mockTodoService.update).toHaveBeenCalledWith('1', { status: 'pending' })
      })
    })

    it('should call onUpdate callback after successful update', async () => {
      const mockOnUpdate = vi.fn()
      mockTodoService.update.mockResolvedValueOnce(createTodo())

      render(
        <TodoCardWidget
          todos={[createTodo({ id: 1, status: 'pending' })]}
          onUpdate={mockOnUpdate}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledTimes(1)
      })
    })

    it('should not call onUpdate when not provided', async () => {
      mockTodoService.update.mockResolvedValueOnce(createTodo())

      render(<TodoCardWidget todos={[createTodo({ id: 1, status: 'pending' })]} />)

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(mockTodoService.update).toHaveBeenCalled()
      })

      // Should not throw error when onUpdate is undefined
    })

    it('should toggle in_progress todo to completed', async () => {
      mockTodoService.update.mockResolvedValueOnce(createTodo({ status: 'completed' }))

      render(
        <TodoCardWidget todos={[createTodo({ id: 1, status: 'in_progress' })]} />
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(mockTodoService.update).toHaveBeenCalledWith('1', { status: 'completed' })
      })
    })
  })

  describe('loading state while updating', () => {
    it('should disable checkbox while updating', async () => {
      // Create a promise that we can resolve manually
      let resolveUpdate: (value: Todo) => void
      const updatePromise = new Promise<Todo>((resolve) => {
        resolveUpdate = resolve
      })
      mockTodoService.update.mockReturnValue(updatePromise)

      render(<TodoCardWidget todos={[createTodo({ id: 1, status: 'pending' })]} />)

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      // Checkbox should be disabled during update
      await waitFor(() => {
        expect(checkbox).toBeDisabled()
      })

      // Resolve the promise
      resolveUpdate!(createTodo({ status: 'completed' }))

      // After update completes, checkbox should be enabled again
      await waitFor(() => {
        expect(checkbox).not.toBeDisabled()
      })
    })

    it('should only disable the checkbox of the todo being updated', async () => {
      let resolveUpdate: (value: Todo) => void
      const updatePromise = new Promise<Todo>((resolve) => {
        resolveUpdate = resolve
      })
      mockTodoService.update.mockReturnValue(updatePromise)

      const todos = [
        createTodo({ id: 1, description: 'First todo' }),
        createTodo({ id: 2, description: 'Second todo' }),
      ]

      render(<TodoCardWidget todos={todos} />)

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0]) // Click first checkbox

      // First checkbox should be disabled
      await waitFor(() => {
        expect(checkboxes[0]).toBeDisabled()
      })

      // Second checkbox should still be enabled
      expect(checkboxes[1]).not.toBeDisabled()

      // Resolve the promise
      resolveUpdate!(createTodo({ status: 'completed' }))

      // After update completes, first checkbox should be enabled again
      await waitFor(() => {
        expect(checkboxes[0]).not.toBeDisabled()
      })
    })

    it('should re-enable checkbox after update error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockTodoService.update.mockRejectedValueOnce(new Error('Network error'))

      render(<TodoCardWidget todos={[createTodo({ id: 1, status: 'pending' })]} />)

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      // After error, checkbox should be re-enabled
      await waitFor(() => {
        expect(checkbox).not.toBeDisabled()
      })

      // Should log error to console
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update todo:', expect.any(Error))

      consoleErrorSpy.mockRestore()
    })

    it('should not call onUpdate after update error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockOnUpdate = vi.fn()
      mockTodoService.update.mockRejectedValueOnce(new Error('Network error'))

      render(
        <TodoCardWidget
          todos={[createTodo({ id: 1, status: 'pending' })]}
          onUpdate={mockOnUpdate}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(mockTodoService.update).toHaveBeenCalled()
      })

      // onUpdate should not be called on error
      expect(mockOnUpdate).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle empty todos array', () => {
      const { container } = render(<TodoCardWidget todos={[]} />)

      // Header should still render
      expect(screen.getByText('Todos')).toBeInTheDocument()

      // No list items should be present
      const listItems = container.querySelectorAll('li')
      expect(listItems).toHaveLength(0)
    })

    it('should handle todo with very long description', () => {
      const longDescription = 'A'.repeat(500)
      render(
        <TodoCardWidget todos={[createTodo({ description: longDescription })]} />
      )

      expect(screen.getByText(longDescription)).toBeInTheDocument()
    })

    it('should handle todo with special characters in description', () => {
      const specialDescription = 'Buy milk & eggs <script>alert("xss")</script>'
      render(
        <TodoCardWidget todos={[createTodo({ description: specialDescription })]} />
      )

      // Should render the text (React escapes by default)
      expect(screen.getByText((content) => content.includes('Buy milk & eggs'))).toBeInTheDocument()
    })

    it('should handle todo with unicode characters in description', () => {
      const unicodeDescription = 'Task with emoji and Chinese: emoji placeholder and Chinese text'
      render(
        <TodoCardWidget todos={[createTodo({ description: unicodeDescription })]} />
      )

      expect(screen.getByText(unicodeDescription)).toBeInTheDocument()
    })

    it('should handle large id numbers', async () => {
      mockTodoService.update.mockResolvedValueOnce(createTodo())

      render(
        <TodoCardWidget todos={[createTodo({ id: 999999999, status: 'pending' })]} />
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(mockTodoService.update).toHaveBeenCalledWith('999999999', { status: 'completed' })
      })
    })
  })

  describe('accessibility', () => {
    it('should have proper checkbox input type', () => {
      render(<TodoCardWidget todos={[createTodo()]} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('type', 'checkbox')
    })

    it('should have proper list structure', () => {
      const { container } = render(<TodoCardWidget todos={[createTodo()]} />)

      const list = container.querySelector('ul')
      expect(list).toBeInTheDocument()

      const listItem = container.querySelector('li')
      expect(listItem).toBeInTheDocument()
    })

    it('should have hover state on list items', () => {
      const { container } = render(<TodoCardWidget todos={[createTodo()]} />)

      const listItem = container.querySelector('li')
      expect(listItem).toHaveClass('hover:bg-gray-50')
    })
  })
})
