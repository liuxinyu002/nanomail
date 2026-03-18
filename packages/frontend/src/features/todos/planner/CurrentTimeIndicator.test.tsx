import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CurrentTimeIndicator, type CurrentTimeIndicatorProps } from './CurrentTimeIndicator'

// Mock timers for testing time-based behavior
vi.useFakeTimers()

describe('CurrentTimeIndicator', () => {
  let mockContainerRef: React.RefObject<HTMLElement>

  beforeEach(() => {
    // Create a mock container ref
    mockContainerRef = {
      current: document.createElement('div')
    }
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  const defaultProps: CurrentTimeIndicatorProps = {
    containerRef: mockContainerRef
  }

  describe('Rendering', () => {
    it('should render a container with data-testid', () => {
      render(<CurrentTimeIndicator {...defaultProps} />)

      expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()
    })

    it('should render a red dot indicator', () => {
      render(<CurrentTimeIndicator {...defaultProps} />)

      const dot = screen.getByTestId('current-time-dot')
      expect(dot).toBeInTheDocument()
      expect(dot).toHaveClass('bg-red-500')
      expect(dot).toHaveClass('rounded-full')
    })

    it('should render a red horizontal line', () => {
      render(<CurrentTimeIndicator {...defaultProps} />)

      const line = screen.getByTestId('current-time-line')
      expect(line).toBeInTheDocument()
      expect(line).toHaveClass('bg-red-500')
    })

    it('should have correct dot size (8px = w-2 h-2)', () => {
      render(<CurrentTimeIndicator {...defaultProps} />)

      const dot = screen.getByTestId('current-time-dot')
      expect(dot).toHaveClass('w-2')
      expect(dot).toHaveClass('h-2')
    })

    it('should have correct line height (2px = h-[2px])', () => {
      render(<CurrentTimeIndicator {...defaultProps} />)

      const line = screen.getByTestId('current-time-line')
      expect(line).toHaveClass('h-[2px]')
    })
  })

  describe('Position Calculation', () => {
    it('should calculate position based on current time', () => {
      // Mock time to 10:30 (10 hours * 60 + 30 minutes = 630px)
      const mockDate = new Date('2024-01-01T10:30:00')
      vi.setSystemTime(mockDate)

      render(<CurrentTimeIndicator {...defaultProps} />)

      const indicator = screen.getByTestId('current-time-indicator')
      expect(indicator.style.top).toBe('630px')
    })

    it('should calculate position at midnight (00:00) correctly', () => {
      const mockDate = new Date('2024-01-01T00:00:00')
      vi.setSystemTime(mockDate)

      render(<CurrentTimeIndicator {...defaultProps} />)

      const indicator = screen.getByTestId('current-time-indicator')
      expect(indicator.style.top).toBe('0px')
    })

    it('should calculate position at 23:59 correctly', () => {
      const mockDate = new Date('2024-01-01T23:59:00')
      vi.setSystemTime(mockDate)

      render(<CurrentTimeIndicator {...defaultProps} />)

      const indicator = screen.getByTestId('current-time-indicator')
      // 23 * 60 + 59 = 1439px
      expect(indicator.style.top).toBe('1439px')
    })

    it('should calculate position at 12:00 correctly', () => {
      const mockDate = new Date('2024-01-01T12:00:00')
      vi.setSystemTime(mockDate)

      render(<CurrentTimeIndicator {...defaultProps} />)

      const indicator = screen.getByTestId('current-time-indicator')
      // 12 * 60 + 0 = 720px
      expect(indicator.style.top).toBe('720px')
    })
  })

  describe('Time Updates', () => {
    it('should update position when time changes', () => {
      const initialDate = new Date('2024-01-01T10:00:00')
      vi.setSystemTime(initialDate)

      render(<CurrentTimeIndicator {...defaultProps} />)

      const indicator = screen.getByTestId('current-time-indicator')
      expect(indicator.style.top).toBe('600px') // 10 * 60

      // Advance time by 1 minute
      act(() => {
        vi.advanceTimersByTime(60000)
      })

      // Position should update (10:01 -> 601px)
      expect(indicator.style.top).toBe('601px')
    })

    it('should set up interval to update every minute', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')

      render(<CurrentTimeIndicator {...defaultProps} />)

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000)

      setIntervalSpy.mockRestore()
    })

    it('should clear interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      const { unmount } = render(<CurrentTimeIndicator {...defaultProps} />)

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()

      clearIntervalSpy.mockRestore()
    })
  })

  describe('Styling', () => {
    it('should be absolutely positioned', () => {
      render(<CurrentTimeIndicator {...defaultProps} />)

      const indicator = screen.getByTestId('current-time-indicator')
      expect(indicator).toHaveClass('absolute')
      expect(indicator).toHaveClass('left-0')
      expect(indicator).toHaveClass('right-0')
    })

    it('should have flex layout for dot and line alignment', () => {
      render(<CurrentTimeIndicator {...defaultProps} />)

      const indicator = screen.getByTestId('current-time-indicator')
      expect(indicator).toHaveClass('flex')
      expect(indicator).toHaveClass('items-center')
    })

    it('should have z-index for visibility', () => {
      render(<CurrentTimeIndicator {...defaultProps} />)

      const indicator = screen.getByTestId('current-time-indicator')
      expect(indicator).toHaveClass('z-10')
    })

    it('should have pointer-events-none to not interfere with drag-drop', () => {
      render(<CurrentTimeIndicator {...defaultProps} />)

      const indicator = screen.getByTestId('current-time-indicator')
      expect(indicator).toHaveClass('pointer-events-none')
    })
  })

  describe('Custom className', () => {
    it('should accept and apply custom className prop', () => {
      render(<CurrentTimeIndicator {...defaultProps} className="custom-class" />)

      const indicator = screen.getByTestId('current-time-indicator')
      expect(indicator).toHaveClass('custom-class')
    })

    it('should merge custom className with default classes', () => {
      render(<CurrentTimeIndicator {...defaultProps} className="bg-opacity-50" />)

      const indicator = screen.getByTestId('current-time-indicator')
      expect(indicator).toHaveClass('absolute')
      expect(indicator).toHaveClass('bg-opacity-50')
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label describing current time indicator', () => {
      const mockDate = new Date('2024-01-01T14:30:00')
      vi.setSystemTime(mockDate)

      render(<CurrentTimeIndicator {...defaultProps} />)

      const indicator = screen.getByTestId('current-time-indicator')
      expect(indicator).toHaveAttribute('aria-label', 'Current time: 14:30')
    })

    it('should have role="presentation" for decorative purpose', () => {
      render(<CurrentTimeIndicator {...defaultProps} />)

      const indicator = screen.getByTestId('current-time-indicator')
      expect(indicator).toHaveAttribute('role', 'presentation')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null containerRef gracefully', () => {
      const nullRef = { current: null }

      // Should not throw
      expect(() => {
        render(<CurrentTimeIndicator containerRef={nullRef} />)
      }).not.toThrow()
    })

    it('should handle undefined containerRef gracefully', () => {
      // Should not throw
      expect(() => {
        render(<CurrentTimeIndicator containerRef={{ current: undefined }} />)
      }).not.toThrow()
    })

    it('should render correctly with no className prop', () => {
      render(<CurrentTimeIndicator containerRef={mockContainerRef} />)

      expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()
    })
  })

  describe('Dot Positioning', () => {
    it('should position dot at left edge (ml-14 = 56px from left)', () => {
      render(<CurrentTimeIndicator {...defaultProps} />)

      const dot = screen.getByTestId('current-time-dot')
      expect(dot).toHaveClass('ml-14')
    })
  })

  describe('Line Flexibility', () => {
    it('should have flex-1 class on line to fill remaining space', () => {
      render(<CurrentTimeIndicator {...defaultProps} />)

      const line = screen.getByTestId('current-time-line')
      expect(line).toHaveClass('flex-1')
    })
  })
})