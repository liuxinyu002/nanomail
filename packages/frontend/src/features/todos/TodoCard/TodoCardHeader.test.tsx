import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoCardHeader } from './TodoCardHeader'

describe('TodoCardHeader', () => {
  const defaultProps = {
    description: 'Test todo description',
    completed: false,
    onToggle: vi.fn(),
    onDelete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render the todo description', () => {
      render(<TodoCardHeader {...defaultProps} />)

      expect(screen.getByTestId('todo-card-title')).toHaveTextContent('Test todo description')
    })

    it('should render a checkbox', () => {
      render(<TodoCardHeader {...defaultProps} />)

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('should render unchecked checkbox when completed is false', () => {
      render(<TodoCardHeader {...defaultProps} completed={false} />)

      expect(screen.getByRole('checkbox')).not.toBeChecked()
    })

    it('should render checked checkbox when completed is true', () => {
      render(<TodoCardHeader {...defaultProps} completed={true} />)

      expect(screen.getByRole('checkbox')).toBeChecked()
    })

    it('should call onToggle when checkbox is clicked', async () => {
      const onToggle = vi.fn()
      render(<TodoCardHeader {...defaultProps} onToggle={onToggle} />)

      await userEvent.click(screen.getByRole('checkbox'))

      expect(onToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('Phase 2: Ordinal Badge', () => {
    it('should render ordinal badge when ordinal prop is provided', () => {
      render(<TodoCardHeader {...defaultProps} ordinal={1} />)

      const badge = screen.getByTestId('ordinal-badge')
      expect(badge).toBeInTheDocument()
    })

    it('should display correct ordinal format (e.g., "1.")', () => {
      render(<TodoCardHeader {...defaultProps} ordinal={1} />)

      const badge = screen.getByTestId('ordinal-badge')
      expect(badge).toHaveTextContent('1.')
    })

    it('should display correct ordinal for different numbers', () => {
      const { rerender } = render(<TodoCardHeader {...defaultProps} ordinal={1} />)

      expect(screen.getByTestId('ordinal-badge')).toHaveTextContent('1.')

      rerender(<TodoCardHeader {...defaultProps} ordinal={5} />)
      expect(screen.getByTestId('ordinal-badge')).toHaveTextContent('5.')

      rerender(<TodoCardHeader {...defaultProps} ordinal={12} />)
      expect(screen.getByTestId('ordinal-badge')).toHaveTextContent('12.')
    })

    it('should NOT render ordinal badge when ordinal is undefined', () => {
      render(<TodoCardHeader {...defaultProps} ordinal={undefined} />)

      expect(screen.queryByTestId('ordinal-badge')).not.toBeInTheDocument()
    })

    it('should have lightweight styling (text-gray-400) on ordinal badge', () => {
      render(<TodoCardHeader {...defaultProps} ordinal={1} />)

      const badge = screen.getByTestId('ordinal-badge')
      expect(badge).toHaveClass('text-gray-400')
    })

    it('should have text-xs class on ordinal badge for compact size', () => {
      render(<TodoCardHeader {...defaultProps} ordinal={1} />)

      const badge = screen.getByTestId('ordinal-badge')
      expect(badge).toHaveClass('text-xs')
    })

    it('should have font-medium class on ordinal badge', () => {
      render(<TodoCardHeader {...defaultProps} ordinal={1} />)

      const badge = screen.getByTestId('ordinal-badge')
      expect(badge).toHaveClass('font-medium')
    })

    it('should have tabular-nums class for number alignment', () => {
      render(<TodoCardHeader {...defaultProps} ordinal={1} />)

      const badge = screen.getByTestId('ordinal-badge')
      expect(badge).toHaveClass('tabular-nums')
    })

    it('should have fixed width container (w-6) for alignment', () => {
      render(<TodoCardHeader {...defaultProps} ordinal={1} />)

      const container = screen.getByTestId('ordinal-slot')
      expect(container).toHaveClass('w-6')
    })
  })

  describe('Phase 2: Hover-to-Drag Interaction', () => {
    it('should show ordinal badge by default when both ordinal and dragHandleProps are provided', () => {
      const dragHandleProps = { 'data-drag': 'true' }
      render(
        <TodoCardHeader
          {...defaultProps}
          ordinal={1}
          dragHandleProps={dragHandleProps}
        />
      )

      expect(screen.getByTestId('ordinal-badge')).toBeInTheDocument()
      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument()
    })

    it('should hide ordinal badge and show drag handle on hover', async () => {
      const dragHandleProps = { 'data-drag': 'true' }
      render(
        <TodoCardHeader
          {...defaultProps}
          ordinal={1}
          dragHandleProps={dragHandleProps}
        />
      )

      // Initially, badge should be visible
      expect(screen.getByTestId('ordinal-badge')).toBeInTheDocument()
      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument()

      // Hover on the header container
      const container = screen.getByTestId('todo-card-header')
      fireEvent.mouseEnter(container)

      // After hover, badge should be hidden and drag handle visible
      expect(screen.queryByTestId('ordinal-badge')).not.toBeInTheDocument()
      expect(screen.getByTestId('drag-handle')).toBeInTheDocument()
    })

    it('should restore ordinal badge when mouse leaves', async () => {
      const dragHandleProps = { 'data-drag': 'true' }
      render(
        <TodoCardHeader
          {...defaultProps}
          ordinal={1}
          dragHandleProps={dragHandleProps}
        />
      )

      const container = screen.getByTestId('todo-card-header')

      // Hover
      fireEvent.mouseEnter(container)
      expect(screen.getByTestId('drag-handle')).toBeInTheDocument()

      // Leave
      fireEvent.mouseLeave(container)
      expect(screen.getByTestId('ordinal-badge')).toBeInTheDocument()
      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument()
    })

    it('should NOT show drag handle when dragHandleProps is undefined', async () => {
      render(
        <TodoCardHeader
          {...defaultProps}
          ordinal={1}
          dragHandleProps={undefined}
        />
      )

      const container = screen.getByTestId('todo-card-header')
      fireEvent.mouseEnter(container)

      // No drag handle should appear even on hover
      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument()
    })

    it('should NOT show drag handle when ordinal is undefined (no sortable context)', async () => {
      const dragHandleProps = { 'data-drag': 'true' }
      render(
        <TodoCardHeader
          {...defaultProps}
          ordinal={undefined}
          dragHandleProps={dragHandleProps}
        />
      )

      const container = screen.getByTestId('todo-card-header')
      fireEvent.mouseEnter(container)

      // No drag handle should appear
      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument()
    })
  })

  describe('Phase 2: Drag Handle Styling', () => {
    it('should have cursor-grab class on drag handle', async () => {
      const dragHandleProps = { 'data-drag': 'true' }
      render(
        <TodoCardHeader
          {...defaultProps}
          ordinal={1}
          dragHandleProps={dragHandleProps}
        />
      )

      const container = screen.getByTestId('todo-card-header')
      fireEvent.mouseEnter(container)

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveClass('cursor-grab')
    })

    it('should have active:cursor-grabbing class on drag handle', async () => {
      const dragHandleProps = { 'data-drag': 'true' }
      render(
        <TodoCardHeader
          {...defaultProps}
          ordinal={1}
          dragHandleProps={dragHandleProps}
        />
      )

      const container = screen.getByTestId('todo-card-header')
      fireEvent.mouseEnter(container)

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveClass('active:cursor-grabbing')
    })

    it('should apply dragHandleProps to the drag handle button', async () => {
      const dragHandleProps = {
        'data-drag': 'true',
        'aria-label': 'Drag handle',
      }
      render(
        <TodoCardHeader
          {...defaultProps}
          ordinal={1}
          dragHandleProps={dragHandleProps}
        />
      )

      const container = screen.getByTestId('todo-card-header')
      fireEvent.mouseEnter(container)

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveAttribute('data-drag', 'true')
    })

    it('should have text-gray-400 and hover:text-gray-600 for drag handle', async () => {
      const dragHandleProps = { 'data-drag': 'true' }
      render(
        <TodoCardHeader
          {...defaultProps}
          ordinal={1}
          dragHandleProps={dragHandleProps}
        />
      )

      const container = screen.getByTestId('todo-card-header')
      fireEvent.mouseEnter(container)

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveClass('text-gray-400')
      expect(dragHandle).toHaveClass('hover:text-gray-600')
    })
  })

  describe('Delete Button', () => {
    it('should render delete button when showDelete is true and onDelete is provided', () => {
      render(<TodoCardHeader {...defaultProps} showDelete={true} />)

      const deleteButton = screen.getByRole('button', { name: /delete/i })
      expect(deleteButton).toBeInTheDocument()
    })

    it('should NOT render delete button when showDelete is false', () => {
      render(<TodoCardHeader {...defaultProps} showDelete={false} />)

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('should NOT render delete button when onDelete is undefined', () => {
      render(<TodoCardHeader {...defaultProps} onDelete={undefined} showDelete={true} />)

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })
  })

  describe('Completed State', () => {
    it('should show line-through style when completed', () => {
      render(<TodoCardHeader {...defaultProps} completed={true} />)

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('line-through')
    })

    it('should have opacity-50 class when completed', () => {
      render(<TodoCardHeader {...defaultProps} completed={true} />)

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('opacity-50')
    })
  })
})