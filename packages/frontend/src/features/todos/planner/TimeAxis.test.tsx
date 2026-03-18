import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { TimeAxis, type TimeAxisProps } from './TimeAxis'

describe('TimeAxis', () => {
  const defaultProps: TimeAxisProps = {}

  describe('Rendering', () => {
    it('should render a container with data-testid', () => {
      render(<TimeAxis {...defaultProps} />)

      expect(screen.getByTestId('time-axis')).toBeInTheDocument()
    })

    it('should render exactly 24 hour labels', () => {
      render(<TimeAxis {...defaultProps} />)

      const hourLabels = screen.getAllByTestId(/time-axis-hour/)
      expect(hourLabels).toHaveLength(24)
    })

    it('should render hours from 00:00 to 23:00', () => {
      render(<TimeAxis {...defaultProps} />)

      // Check first hour
      expect(screen.getByText('00:00')).toBeInTheDocument()
      // Check last hour
      expect(screen.getByText('23:00')).toBeInTheDocument()
    })

    it('should render all hours in correct format (HH:00)', () => {
      render(<TimeAxis {...defaultProps} />)

      const expectedHours = [
        '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
        '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
        '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
        '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
      ]

      expectedHours.forEach(hour => {
        expect(screen.getByText(hour)).toBeInTheDocument()
      })
    })
  })

  describe('Styling', () => {
    it('should have fixed width of 64px (w-16)', () => {
      render(<TimeAxis {...defaultProps} />)

      const container = screen.getByTestId('time-axis')
      expect(container).toHaveClass('w-16')
    })

    it('should have shrink-0 class to prevent shrinking', () => {
      render(<TimeAxis {...defaultProps} />)

      const container = screen.getByTestId('time-axis')
      expect(container).toHaveClass('shrink-0')
    })

    it('should have text-xs class for hour labels', () => {
      render(<TimeAxis {...defaultProps} />)

      const hourLabels = screen.getAllByTestId(/time-axis-hour/)
      hourLabels.forEach(label => {
        expect(label).toHaveClass('text-xs')
      })
    })

    it('should have text-muted-foreground class for hour labels', () => {
      render(<TimeAxis {...defaultProps} />)

      const hourLabels = screen.getAllByTestId(/time-axis-hour/)
      hourLabels.forEach(label => {
        expect(label).toHaveClass('text-muted-foreground')
      })
    })

    it('should have h-[60px] class for each hour slot', () => {
      render(<TimeAxis {...defaultProps} />)

      const hourSlots = screen.getAllByTestId(/time-axis-slot/)
      hourSlots.forEach(slot => {
        expect(slot).toHaveClass('h-[60px]')
      })
    })
  })

  describe('Custom className', () => {
    it('should accept and apply custom className prop', () => {
      render(<TimeAxis className="custom-test-class" />)

      const container = screen.getByTestId('time-axis')
      expect(container).toHaveClass('custom-test-class')
    })

    it('should merge custom className with default classes', () => {
      render(<TimeAxis className="w-20 bg-gray-100" />)

      const container = screen.getByTestId('time-axis')
      // Note: tailwind-merge replaces w-16 with w-20 (conflicting classes)
      expect(container).toHaveClass('w-20') // Custom class wins over default
      expect(container).toHaveClass('bg-gray-100') // Custom class
      expect(container).toHaveClass('shrink-0') // Default non-conflicting class remains
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label for the time axis container', () => {
      render(<TimeAxis {...defaultProps} />)

      const container = screen.getByTestId('time-axis')
      expect(container).toHaveAttribute('aria-label', 'Time axis')
    })

    it('should have role="presentation" for decorative hour slots', () => {
      render(<TimeAxis {...defaultProps} />)

      const hourSlots = screen.getAllByTestId(/time-axis-slot/)
      hourSlots.forEach(slot => {
        expect(slot).toHaveAttribute('role', 'presentation')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should render correctly with no props', () => {
      render(<TimeAxis />)

      expect(screen.getByTestId('time-axis')).toBeInTheDocument()
      expect(screen.getAllByTestId(/time-axis-hour/)).toHaveLength(24)
    })

    it('should render consistently on re-render', () => {
      const { rerender } = render(<TimeAxis />)

      expect(screen.getAllByTestId(/time-axis-hour/)).toHaveLength(24)

      rerender(<TimeAxis className="new-class" />)

      expect(screen.getAllByTestId(/time-axis-hour/)).toHaveLength(24)
    })
  })

  describe('Layout Structure', () => {
    it('should render hour labels aligned to the right', () => {
      render(<TimeAxis {...defaultProps} />)

      const hourSlots = screen.getAllByTestId(/time-axis-slot/)
      hourSlots.forEach(slot => {
        expect(slot).toHaveClass('justify-end')
      })
    })

    it('should have proper padding for hour labels', () => {
      render(<TimeAxis {...defaultProps} />)

      const hourSlots = screen.getAllByTestId(/time-axis-slot/)
      hourSlots.forEach(slot => {
        expect(slot).toHaveClass('pr-2')
      })
    })

    it('should align items to start of each hour slot', () => {
      render(<TimeAxis {...defaultProps} />)

      const hourSlots = screen.getAllByTestId(/time-axis-slot/)
      hourSlots.forEach(slot => {
        expect(slot).toHaveClass('items-start')
      })
    })
  })
})