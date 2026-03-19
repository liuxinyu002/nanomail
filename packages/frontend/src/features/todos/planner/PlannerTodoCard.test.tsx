import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlannerTodoCard } from './PlannerTodoCard'
import type { Todo } from '@nanomail/shared'

// Mock the mutation hook
const mockUpdateMutate = vi.fn()
vi.mock('@/hooks', () => ({
  useUpdateTodoMutation: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
}))

// Helper to create mock Todo
function createMockTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    emailId: 100,
    description: 'Test todo',
    status: 'pending',
    deadline: null,
    boardColumnId: 1,
    position: 0,
    notes: null,
    color: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('PlannerTodoCard', () => {
  beforeEach(() => {
    mockUpdateMutate.mockClear()
  })

  describe('rendering', () => {
    it('renders with correct test id', () => {
      const todo = createMockTodo({ id: 42 })
      render(<PlannerTodoCard todo={todo} />)

      expect(screen.getByTestId('planner-todo-card-42')).toBeInTheDocument()
    })

    it('displays todo description in title', () => {
      const todo = createMockTodo({ id: 1, description: 'Buy groceries' })
      render(<PlannerTodoCard todo={todo} />)

      // Title is in the header row span with truncate class
      const allElements = screen.getAllByText('Buy groceries')
      const titleSpan = allElements.find(el => el.tagName === 'SPAN' && el.classList.contains('truncate'))
      expect(titleSpan).toBeInTheDocument()
    })

    it('does NOT display description as separate element - only title', () => {
      const todo = createMockTodo({ id: 1, description: 'Main task title' })
      render(<PlannerTodoCard todo={todo} />)

      // The card should only show the description as the title
      // No separate description element should exist
      const card = screen.getByTestId('planner-todo-card-1')
      expect(card).toHaveTextContent('Main task title')
      expect(screen.queryByTestId('todo-description')).not.toBeInTheDocument()
    })
  })

  describe('color bar', () => {
    it('renders a color bar on the left side', () => {
      const todo = createMockTodo({ id: 1 })
      render(<PlannerTodoCard todo={todo} />)

      const colorBar = screen.getByTestId('todo-card-color-bar')
      expect(colorBar).toBeInTheDocument()
    })

    it('uses todo.color when provided (hex color)', () => {
      const todo = createMockTodo({ id: 1, color: '#FF5733' })
      render(<PlannerTodoCard todo={todo} />)

      const colorBar = screen.getByTestId('todo-card-color-bar')
      expect(colorBar).toHaveStyle({ backgroundColor: '#FF5733' })
    })

    it('falls back to #9CA3AF when todo.color is null', () => {
      const todo = createMockTodo({ id: 1, color: null })
      render(<PlannerTodoCard todo={todo} />)

      const colorBar = screen.getByTestId('todo-card-color-bar')
      expect(colorBar).toHaveStyle({ backgroundColor: '#9CA3AF' })
    })

    it('uses different colors for different todo.color values', () => {
      const todo1 = createMockTodo({ id: 1, color: '#3B82F6' }) // blue
      render(<PlannerTodoCard todo={todo1} />)
      expect(screen.getByTestId('todo-card-color-bar')).toHaveStyle({ backgroundColor: '#3B82F6' })
    })

    it('handles lowercase hex colors', () => {
      const todo = createMockTodo({ id: 1, color: '#ff5733' })
      render(<PlannerTodoCard todo={todo} />)

      const colorBar = screen.getByTestId('todo-card-color-bar')
      expect(colorBar).toHaveStyle({ backgroundColor: '#ff5733' })
    })
  })

  describe('styling', () => {
    it('has minimal card styling', () => {
      const todo = createMockTodo({ id: 1 })
      render(<PlannerTodoCard todo={todo} />)

      const card = screen.getByTestId('todo-card')
      // Card should have basic styling
      expect(card).toHaveClass('bg-white')
      expect(card).toHaveClass('border')
    })

    it('color bar has narrow width (3-4px)', () => {
      const todo = createMockTodo({ id: 1 })
      render(<PlannerTodoCard todo={todo} />)

      const colorBar = screen.getByTestId('todo-card-color-bar')
      // 3-4px = w-1 (4px) in Tailwind
      expect(colorBar).toHaveClass('w-1')
    })

    it('truncates long descriptions to single line', () => {
      const longDescription = 'This is a very long description that should be truncated because it exceeds the available space'
      const todo = createMockTodo({ id: 1, description: longDescription })
      render(<PlannerTodoCard todo={todo} />)

      // Title span has truncate class
      const allElements = screen.getAllByText(longDescription)
      const titleSpan = allElements.find(el => el.tagName === 'SPAN' && el.classList.contains('truncate'))
      expect(titleSpan).toHaveClass('truncate')
    })
  })

  describe('interactions', () => {
    it('has hover styling', () => {
      const todo = createMockTodo({ id: 1 })
      render(<PlannerTodoCard todo={todo} />)

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('hover:bg-gray-50')
    })
  })

  describe('popover integration', () => {
    it('opens popover when card is clicked (not checkbox)', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 1, description: 'My Task' })
      render(<PlannerTodoCard todo={todo} />)

      // Popover should not be visible initially
      expect(screen.queryByTestId('todo-detail-popover')).not.toBeInTheDocument()

      // Click on the card wrapper (not checkbox)
      const card = screen.getByTestId('planner-todo-card-1')
      await user.click(card)

      // Popover should now be visible
      expect(screen.getByTestId('todo-detail-popover')).toBeInTheDocument()
    })

    it('does NOT open popover when checkbox is clicked', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 1 })
      render(<PlannerTodoCard todo={todo} />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      // Popover should NOT open
      expect(screen.queryByTestId('todo-detail-popover')).not.toBeInTheDocument()
      // But mutation should be called
      expect(mockUpdateMutate).toHaveBeenCalled()
    })

    it('shows correct todo description in popover', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 1, description: 'Detailed task description' })
      render(<PlannerTodoCard todo={todo} />)

      const card = screen.getByTestId('planner-todo-card-1')
      await user.click(card)

      // Popover should show the description in the header
      const popover = screen.getByTestId('todo-detail-popover')
      expect(popover).toHaveTextContent('Detailed task description')
    })

    it('shows notes in popover when available', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 1, notes: 'Important notes here' })
      render(<PlannerTodoCard todo={todo} />)

      const card = screen.getByTestId('planner-todo-card-1')
      await user.click(card)

      const popover = screen.getByTestId('todo-detail-popover')
      expect(popover).toHaveTextContent('Important notes here')
    })

    it('shows deadline in popover when available', async () => {
      const user = userEvent.setup()
      const deadlineDate = new Date('2024-12-31T23:59:59Z')
      const todo = createMockTodo({ id: 1, deadline: deadlineDate })
      render(<PlannerTodoCard todo={todo} />)

      const card = screen.getByTestId('planner-todo-card-1')
      await user.click(card)

      const popover = screen.getByTestId('todo-detail-popover')
      // The deadline should be displayed in the popover
      expect(popover).toBeInTheDocument()
    })

    it('popover trigger has correct test id', () => {
      const todo = createMockTodo({ id: 42 })
      render(<PlannerTodoCard todo={todo} />)

      // The wrapper should have the test id
      expect(screen.getByTestId('planner-todo-card-42')).toBeInTheDocument()
    })
  })

  describe('toggle functionality', () => {
    it('should render a checkbox', () => {
      const todo = createMockTodo({ id: 1 })
      render(<PlannerTodoCard todo={todo} />)

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('should render unchecked checkbox for pending todo', () => {
      const todo = createMockTodo({ id: 1, status: 'pending' })
      render(<PlannerTodoCard todo={todo} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('should render checked checkbox for completed todo', () => {
      const todo = createMockTodo({ id: 1, status: 'completed' })
      render(<PlannerTodoCard todo={todo} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should call updateMutation when checkbox is clicked', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 1, status: 'pending' })
      render(<PlannerTodoCard todo={todo} />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: 1,
        data: { status: 'completed' },
      })
    })

    it('should toggle from completed to pending', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 1, status: 'completed' })
      render(<PlannerTodoCard todo={todo} />)

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: 1,
        data: { status: 'pending' },
      })
    })
  })

  describe('completed state styling', () => {
    it('should show line-through for completed todo', () => {
      const todo = createMockTodo({ id: 1, status: 'completed' })
      render(<PlannerTodoCard todo={todo} />)

      // Title span has line-through class
      const allElements = screen.getAllByText('Test todo')
      const titleSpan = allElements.find(el => el.tagName === 'SPAN' && el.classList.contains('line-through'))
      expect(titleSpan).toBeInTheDocument()
    })

    it('should NOT show line-through for pending todo', () => {
      const todo = createMockTodo({ id: 1, status: 'pending' })
      render(<PlannerTodoCard todo={todo} />)

      // Title span should not have line-through class
      const allElements = screen.getAllByText('Test todo')
      const titleSpan = allElements.find(el => el.tagName === 'SPAN' && el.classList.contains('truncate'))
      expect(titleSpan).not.toHaveClass('line-through')
    })

    it('should show opacity for completed todo', () => {
      const todo = createMockTodo({ id: 1, status: 'completed' })
      render(<PlannerTodoCard todo={todo} />)

      // Title span has opacity-50 class
      const allElements = screen.getAllByText('Test todo')
      const titleSpan = allElements.find(el => el.tagName === 'SPAN' && el.classList.contains('opacity-50'))
      expect(titleSpan).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles empty description', () => {
      const todo = createMockTodo({ id: 1, description: '' })
      render(<PlannerTodoCard todo={todo} />)

      const card = screen.getByTestId('planner-todo-card-1')
      expect(card).toBeInTheDocument()
    })

    it('handles very long description', () => {
      const longDescription = 'A'.repeat(500)
      const todo = createMockTodo({ id: 1, description: longDescription })
      render(<PlannerTodoCard todo={todo} />)

      const card = screen.getByTestId('planner-todo-card-1')
      expect(card).toBeInTheDocument()
    })

    it('handles special characters in description', () => {
      const specialDescription = 'Task with <script>alert("xss")</script> & "quotes"'
      const todo = createMockTodo({ id: 1, description: specialDescription })
      render(<PlannerTodoCard todo={todo} />)

      // React should escape the content - find the title span specifically
      const allElements = screen.getAllByText(specialDescription)
      const titleSpan = allElements.find(el => el.tagName === 'SPAN' && el.classList.contains('truncate'))
      expect(titleSpan).toBeInTheDocument()
    })
  })
})