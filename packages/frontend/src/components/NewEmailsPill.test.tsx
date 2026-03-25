import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NewEmailsPill, type NewEmailsPillProps } from './NewEmailsPill'

describe('NewEmailsPill', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    mockOnClick.mockClear()
  })

  describe('Rendering', () => {
    it('should render with correct count for single email', () => {
      render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      expect(screen.getByText(/1 new email/i)).toBeInTheDocument()
    })

    it('should render with correct count for multiple emails', () => {
      render(<NewEmailsPill count={5} onClick={mockOnClick} />)

      expect(screen.getByText(/5 new emails/i)).toBeInTheDocument()
    })

    it('should render with count 0', () => {
      render(<NewEmailsPill count={0} onClick={mockOnClick} />)

      expect(screen.getByText(/0 new emails/i)).toBeInTheDocument()
    })

    it('should render with large count', () => {
      render(<NewEmailsPill count={1000} onClick={mockOnClick} />)

      expect(screen.getByText(/1000 new emails/i)).toBeInTheDocument()
    })

    it('should render Mail icon', () => {
      const { container } = render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      // lucide-react icons render as SVG elements
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('Click Interaction', () => {
    it('should call onClick when clicked', () => {
      render(<NewEmailsPill count={5} onClick={mockOnClick} />)

      const pill = screen.getByRole('button')
      fireEvent.click(pill)

      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('should call onClick exactly once per click', () => {
      render(<NewEmailsPill count={3} onClick={mockOnClick} />)

      const pill = screen.getByRole('button')
      fireEvent.click(pill)
      fireEvent.click(pill)
      fireEvent.click(pill)

      expect(mockOnClick).toHaveBeenCalledTimes(3)
    })
  })

  describe('Positioning Classes', () => {
    it('should have absolute positioning', () => {
      const { container } = render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('absolute')
    })

    it('should be positioned at top-2', () => {
      const { container } = render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('top-2')
    })

    it('should be horizontally centered with left-1/2', () => {
      const { container } = render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('left-1/2')
    })

    it('should have -translate-x-1/2 for centering', () => {
      const { container } = render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('-translate-x-1/2')
    })

    it('should have z-10 for stacking context', () => {
      const { container } = render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('z-10')
    })
  })

  describe('Styling Classes', () => {
    it('should have rounded-full class on button', () => {
      render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('rounded-full')
    })

    it('should have shadow-lg class on button', () => {
      render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('shadow-lg')
    })

    it('should have bg-primary class on button', () => {
      render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary')
    })

    it('should have text-primary-foreground class on button', () => {
      render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-primary-foreground')
    })

    it('should have hover:bg-primary/90 class on button', () => {
      render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-primary/90')
    })
  })

  describe('Animation', () => {
    it('should have bounce-subtle animation class', () => {
      render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('animate-bounce-subtle')
    })
  })

  describe('Accessibility', () => {
    it('should be focusable as a button', () => {
      render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should have descriptive text content', () => {
      render(<NewEmailsPill count={3} onClick={mockOnClick} />)

      // The button should have text describing the action
      expect(screen.getByText(/3 new emails/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle negative count (edge case)', () => {
      render(<NewEmailsPill count={-1} onClick={mockOnClick} />)

      // Should still render without crashing
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should handle very large count', () => {
      render(<NewEmailsPill count={999999} onClick={mockOnClick} />)

      expect(screen.getByText(/999999 new emails/i)).toBeInTheDocument()
    })

    it('should handle decimal count by displaying as-is', () => {
      // TypeScript would prevent this, but testing runtime behavior
      render(<NewEmailsPill count={1.5 as unknown as number} onClick={mockOnClick} />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Props Interface', () => {
    it('should accept count prop', () => {
      const props: NewEmailsPillProps = { count: 5, onClick: mockOnClick }
      render(<NewEmailsPill {...props} />)

      expect(screen.getByText(/5/)).toBeInTheDocument()
    })

    it('should accept onClick prop', () => {
      render(<NewEmailsPill count={1} onClick={mockOnClick} />)

      fireEvent.click(screen.getByRole('button'))
      expect(mockOnClick).toHaveBeenCalled()
    })
  })
})
