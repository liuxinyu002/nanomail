import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CalendarDayCell, type CalendarDayCellProps } from './CalendarDayCell'

describe('CalendarDayCell', () => {
  const mockDate = new Date('2024-03-15T12:00:00.000Z')
  const mockOnClick = vi.fn()

  const defaultProps: CalendarDayCellProps = {
    date: mockDate,
    isCurrentMonth: true,
    isToday: false,
    todoCount: 0,
    highestPriorityColumn: null,
    onClick: mockOnClick,
  }

  beforeEach(() => {
    mockOnClick.mockClear()
  })

  describe('Rendering', () => {
    it('should render the day number', () => {
      render(<CalendarDayCell {...defaultProps} />)

      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('should render with current month styling when isCurrentMonth is true', () => {
      render(<CalendarDayCell {...defaultProps} />)

      const cell = screen.getByTestId('calendar-day-cell')
      expect(cell).not.toHaveClass('bg-muted/30')
      expect(cell).not.toHaveClass('text-muted-foreground')
    })

    it('should render with muted styling when isCurrentMonth is false', () => {
      render(<CalendarDayCell {...defaultProps} isCurrentMonth={false} />)

      const cell = screen.getByTestId('calendar-day-cell')
      expect(cell).toHaveClass('bg-muted/30')
      expect(cell).toHaveClass('text-muted-foreground')
    })

    it('should render with ring styling when isToday is true', () => {
      render(<CalendarDayCell {...defaultProps} isToday={true} />)

      const cell = screen.getByTestId('calendar-day-cell')
      expect(cell).toHaveClass('ring-2')
      expect(cell).toHaveClass('ring-primary')
    })

    it('should not render ring styling when isToday is false', () => {
      render(<CalendarDayCell {...defaultProps} isToday={false} />)

      const cell = screen.getByTestId('calendar-day-cell')
      expect(cell).not.toHaveClass('ring-2')
    })
  })

  describe('Todo Count Badge', () => {
    it('should not render badge when todoCount is 0', () => {
      render(<CalendarDayCell {...defaultProps} todoCount={0} />)

      expect(screen.queryByTestId('todo-count-badge')).not.toBeInTheDocument()
    })

    it('should render badge with count when todoCount is greater than 0', () => {
      render(<CalendarDayCell {...defaultProps} todoCount={3} />)

      const badge = screen.getByTestId('todo-count-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('3')
    })

    it('should render badge with correct styling', () => {
      render(<CalendarDayCell {...defaultProps} todoCount={5} />)

      const badge = screen.getByTestId('todo-count-badge')
      expect(badge).toHaveClass('bg-primary')
      expect(badge).toHaveClass('text-primary-foreground')
    })
  })

  describe('Column Color Indicator', () => {
    it('should not render priority indicator when highestPriorityColumn is null', () => {
      render(<CalendarDayCell {...defaultProps} highestPriorityColumn={null} />)

      expect(screen.queryByTestId('priority-indicator')).not.toBeInTheDocument()
    })

    it('should render blue indicator for Todo column (2)', () => {
      render(<CalendarDayCell {...defaultProps} highestPriorityColumn={2} />)

      const indicator = screen.getByTestId('priority-indicator')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveClass('bg-blue-500')
    })

    it('should render amber indicator for In Progress column (3)', () => {
      render(<CalendarDayCell {...defaultProps} highestPriorityColumn={3} />)

      const indicator = screen.getByTestId('priority-indicator')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveClass('bg-amber-500')
    })

    it('should render gray indicator for Inbox column (1)', () => {
      render(<CalendarDayCell {...defaultProps} highestPriorityColumn={1} />)

      const indicator = screen.getByTestId('priority-indicator')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveClass('bg-gray-500')
    })

    it('should render green indicator for Done column (4)', () => {
      render(<CalendarDayCell {...defaultProps} highestPriorityColumn={4} />)

      const indicator = screen.getByTestId('priority-indicator')
      expect(indicator).toBeInTheDocument()
      expect(indicator).toHaveClass('bg-green-500')
    })
  })

  describe('Click Interaction', () => {
    it('should call onClick with date when clicked', () => {
      render(<CalendarDayCell {...defaultProps} />)

      const cell = screen.getByTestId('calendar-day-cell')
      fireEvent.click(cell)

      expect(mockOnClick).toHaveBeenCalledTimes(1)
      expect(mockOnClick).toHaveBeenCalledWith(mockDate)
    })

    it('should have cursor-pointer class for clickable styling', () => {
      render(<CalendarDayCell {...defaultProps} />)

      const cell = screen.getByTestId('calendar-day-cell')
      expect(cell).toHaveClass('cursor-pointer')
    })
  })

  describe('Memoization', () => {
    it('should not re-render when props are the same', () => {
      const { rerender } = render(<CalendarDayCell {...defaultProps} />)

      // First render
      expect(screen.getByText('15')).toBeInTheDocument()

      // Rerender with same props
      rerender(<CalendarDayCell {...defaultProps} />)

      // Should still be in document (not re-mounted)
      expect(screen.getByText('15')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have appropriate role for clickable cell', () => {
      render(<CalendarDayCell {...defaultProps} />)

      const cell = screen.getByTestId('calendar-day-cell')
      expect(cell).toHaveAttribute('role', 'button')
    })

    it('should have aria-label with date information', () => {
      render(<CalendarDayCell {...defaultProps} />)

      const cell = screen.getByTestId('calendar-day-cell')
      expect(cell).toHaveAttribute('aria-label')
      expect(cell.getAttribute('aria-label')).toContain('15')
    })

    it('should include todo count in aria-label when present', () => {
      render(<CalendarDayCell {...defaultProps} todoCount={3} />)

      const cell = screen.getByTestId('calendar-day-cell')
      const ariaLabel = cell.getAttribute('aria-label')
      expect(ariaLabel).toContain('3')
      expect(ariaLabel?.toLowerCase()).toContain('todo')
    })
  })
})