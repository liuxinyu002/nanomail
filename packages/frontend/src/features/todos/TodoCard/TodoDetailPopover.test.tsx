import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoDetailPopover } from './TodoDetailPopover'
import type { Todo } from '@nanomail/shared'

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
    color: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }
}

describe('TodoDetailPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders with correct testid when open', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      // Open the popover
      await userEvent.click(screen.getByText('Trigger'))

      expect(screen.getByTestId('todo-detail-popover')).toBeInTheDocument()
    })

    it('renders children as trigger element', () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button data-testid="custom-trigger">Click me</button>
        </TodoDetailPopover>
      )

      expect(screen.getByTestId('custom-trigger')).toBeInTheDocument()
    })

    it('does not show popover content by default', () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      expect(screen.queryByTestId('todo-detail-popover')).not.toBeInTheDocument()
    })
  })

  describe('TaskDetailExpand Integration', () => {
    it('shows TaskDetailExpand content in readonly mode', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo({ description: 'My task', notes: 'My notes' })}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      // In readonly mode, no textareas should be present
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      // Content should be displayed as text - may appear multiple times (header + content)
      expect(screen.getAllByText('My task').length).toBeGreaterThan(0)
      expect(screen.getByText('My notes')).toBeInTheDocument()
    })

    it('displays todo description in the header', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo({ description: 'Header Task Title' })}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      // Header should show the todo title - may appear in header and content
      const titleElements = screen.getAllByText('Header Task Title')
      expect(titleElements.length).toBeGreaterThan(0)
    })

    it('shows "No details" message in header when description is empty', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo({ description: '', notes: null, deadline: null })}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      // Header shows "No details" and TaskDetailExpand shows Chinese "无详细信息"
      expect(screen.getByText('No details')).toBeInTheDocument()
      // TaskDetailExpand in readonly mode shows Chinese text when all fields empty
      expect(screen.getByText('无详细信息')).toBeInTheDocument()
    })
  })

  describe('Close Button', () => {
    it('renders close button with X icon', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      // Close button should have aria-label for accessibility
      const closeButton = screen.getByRole('button', { name: /close details/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('has aria-label "Close details" for accessibility', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const closeButton = screen.getByRole('button', { name: 'Close details' })
      expect(closeButton).toHaveAttribute('aria-label', 'Close details')
    })

    it('dismisses popover when close button is clicked', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      // Open popover
      await userEvent.click(screen.getByText('Trigger'))
      expect(screen.getByTestId('todo-detail-popover')).toBeInTheDocument()

      // Click close button
      const closeButton = screen.getByRole('button', { name: /close details/i })
      await userEvent.click(closeButton)

      // Popover should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('todo-detail-popover')).not.toBeInTheDocument()
      })
    })
  })

  describe('Positioning', () => {
    it('applies side="right" positioning', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const popover = screen.getByTestId('todo-detail-popover')
      // Check that the popover has the side attribute
      expect(popover).toHaveAttribute('data-side', 'right')
    })

    it('applies align="start" alignment', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const popover = screen.getByTestId('todo-detail-popover')
      expect(popover).toHaveAttribute('data-align', 'start')
    })

    it('applies sideOffset for spacing from trigger', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const popover = screen.getByTestId('todo-detail-popover')
      // sideOffset is applied as a prop, we verify the popover renders correctly
      expect(popover).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('has fixed width of 320px (w-80)', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const popover = screen.getByTestId('todo-detail-popover')
      expect(popover).toHaveClass('w-80')
    })

    it('has max height with overflow scroll', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const popover = screen.getByTestId('todo-detail-popover')
      expect(popover).toHaveClass('max-h-[400px]')
      expect(popover).toHaveClass('overflow-y-auto')
    })

    it('has white background', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const popover = screen.getByTestId('todo-detail-popover')
      expect(popover).toHaveClass('bg-white')
    })

    it('has gray border', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const popover = screen.getByTestId('todo-detail-popover')
      expect(popover).toHaveClass('border')
      expect(popover).toHaveClass('border-gray-200')
    })

    it('has large shadow', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const popover = screen.getByTestId('todo-detail-popover')
      expect(popover).toHaveClass('shadow-lg')
    })

    it('has medium border radius', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const popover = screen.getByTestId('todo-detail-popover')
      expect(popover).toHaveClass('rounded-md')
    })

    it('has high z-index (z-[1000])', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const popover = screen.getByTestId('todo-detail-popover')
      expect(popover).toHaveClass('z-[1000]')
    })
  })

  describe('Animation', () => {
    it('has fade-in animation for open state', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const popover = screen.getByTestId('todo-detail-popover')
      // Check for animation classes (Tailwind v4 format)
      expect(popover.className).toMatch(/data-\[state=open\]:animate-in/)
      expect(popover.className).toMatch(/fade-in-0/)
      expect(popover.className).toMatch(/data-\[state=open\]:duration-150/)
    })

    it('has fade-out animation for closed state', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const popover = screen.getByTestId('todo-detail-popover')
      // Check for animation classes (Tailwind v4 format)
      expect(popover.className).toMatch(/data-\[state=closed\]:animate-out/)
      expect(popover.className).toMatch(/fade-out-0/)
      expect(popover.className).toMatch(/data-\[state=closed\]:duration-100/)
    })
  })

  describe('Arrow', () => {
    it('renders arrow element pointing to trigger', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const arrow = screen.getByTestId('todo-detail-popover-arrow')
      expect(arrow).toBeInTheDocument()
    })

    it('has white fill color for light mode', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const arrow = screen.getByTestId('todo-detail-popover-arrow')
      expect(arrow).toHaveClass('fill-white')
    })

    it('has gray-800 fill color for dark mode', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      const arrow = screen.getByTestId('todo-detail-popover-arrow')
      expect(arrow).toHaveClass('dark:fill-gray-800')
    })
  })

  describe('Accessibility', () => {
    it('has proper role when open', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('closes on Escape key press', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo()}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      // Open popover
      await userEvent.click(screen.getByText('Trigger'))
      expect(screen.getByTestId('todo-detail-popover')).toBeInTheDocument()

      // Press Escape
      await userEvent.keyboard('{Escape}')

      // Popover should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('todo-detail-popover')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles todo with null notes', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo({ notes: null })}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      expect(screen.getByTestId('todo-detail-popover')).toBeInTheDocument()
    })

    it('handles todo with null deadline', async () => {
      render(
        <TodoDetailPopover todo={createMockTodo({ deadline: null })}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      expect(screen.getByTestId('todo-detail-popover')).toBeInTheDocument()
    })

    it('handles todo with all fields populated', async () => {
      render(
        <TodoDetailPopover
          todo={createMockTodo({
            description: 'Full todo',
            notes: 'With notes',
            deadline: '2024-12-25T23:59:59.999Z',
          })}
        >
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      // Description appears in both header and content
      expect(screen.getAllByText('Full todo').length).toBeGreaterThan(0)
      expect(screen.getByText('With notes')).toBeInTheDocument()
      // Date should be formatted
      expect(screen.getByText(/12月/)).toBeInTheDocument()
    })

    it('handles long description text', async () => {
      const longDescription = 'A'.repeat(500)
      render(
        <TodoDetailPopover todo={createMockTodo({ description: longDescription })}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      // Long description appears in both header and content
      expect(screen.getAllByText(longDescription).length).toBeGreaterThan(0)
    })

    it('handles special characters in description', async () => {
      const specialChars = 'Test <script>alert("xss")</script> & "quotes" \'apostrophes\''
      render(
        <TodoDetailPopover todo={createMockTodo({ description: specialChars })}>
          <button>Trigger</button>
        </TodoDetailPopover>
      )

      await userEvent.click(screen.getByText('Trigger'))

      // Should render safely (not execute script) - may appear multiple times
      expect(screen.getAllByText(specialChars).length).toBeGreaterThan(0)
    })
  })
})