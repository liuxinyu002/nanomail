import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ViewToggle, type ViewToggleProps, type ViewType } from './ViewToggle'

describe('ViewToggle', () => {
  const defaultProps: ViewToggleProps = {
    activeViews: ['inbox', 'planner', 'board'],
    onToggle: vi.fn(),
  }

  describe('Rendering', () => {
    it('should render all three view buttons', () => {
      render(<ViewToggle {...defaultProps} />)

      expect(screen.getByRole('button', { name: /inbox/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /planner/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /board/i })).toBeInTheDocument()
    })

    it('should render as a container with data-testid', () => {
      render(<ViewToggle {...defaultProps} />)

      expect(screen.getByTestId('view-toggle')).toBeInTheDocument()
    })

    it('should apply glassmorphism styles', () => {
      render(<ViewToggle {...defaultProps} />)

      const container = screen.getByTestId('view-toggle')
      expect(container).toHaveClass('bg-white/80')
      expect(container).toHaveClass('backdrop-blur-md')
      expect(container).toHaveClass('shadow-lg')
    })

    it('should be positioned at bottom center', () => {
      render(<ViewToggle {...defaultProps} />)

      const container = screen.getByTestId('view-toggle')
      expect(container).toHaveClass('fixed')
      expect(container).toHaveClass('bottom-4')
      expect(container).toHaveClass('left-1/2')
      expect(container).toHaveClass('-translate-x-1/2')
    })
  })

  describe('Active State Display', () => {
    it('should show inbox as active when included in activeViews', () => {
      render(<ViewToggle {...defaultProps} activeViews={['inbox']} />)

      const inboxButton = screen.getByRole('button', { name: /inbox/i })
      expect(inboxButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should show inbox as inactive when not in activeViews', () => {
      render(<ViewToggle {...defaultProps} activeViews={['planner', 'board']} />)

      const inboxButton = screen.getByRole('button', { name: /inbox/i })
      expect(inboxButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should show all views as active when all are in activeViews', () => {
      render(<ViewToggle {...defaultProps} activeViews={['inbox', 'planner', 'board']} />)

      expect(screen.getByRole('button', { name: /inbox/i })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: /planner/i })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: /board/i })).toHaveAttribute('aria-pressed', 'true')
    })

    it('should show no views as active when activeViews is empty', () => {
      render(<ViewToggle {...defaultProps} activeViews={[]} />)

      expect(screen.getByRole('button', { name: /inbox/i })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: /planner/i })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: /board/i })).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Toggle Interaction', () => {
    it('should call onToggle with "inbox" when inbox button is clicked', () => {
      const onToggle = vi.fn()
      render(<ViewToggle {...defaultProps} onToggle={onToggle} />)

      fireEvent.click(screen.getByRole('button', { name: /inbox/i }))

      expect(onToggle).toHaveBeenCalledTimes(1)
      expect(onToggle).toHaveBeenCalledWith('inbox')
    })

    it('should call onToggle with "planner" when planner button is clicked', () => {
      const onToggle = vi.fn()
      render(<ViewToggle {...defaultProps} onToggle={onToggle} />)

      fireEvent.click(screen.getByRole('button', { name: /planner/i }))

      expect(onToggle).toHaveBeenCalledTimes(1)
      expect(onToggle).toHaveBeenCalledWith('planner')
    })

    it('should call onToggle with "board" when board button is clicked', () => {
      const onToggle = vi.fn()
      render(<ViewToggle {...defaultProps} onToggle={onToggle} />)

      fireEvent.click(screen.getByRole('button', { name: /board/i }))

      expect(onToggle).toHaveBeenCalledTimes(1)
      expect(onToggle).toHaveBeenCalledWith('board')
    })
  })

  describe('Minimum-One Constraint', () => {
    it('should allow toggling when more than one view is active', () => {
      const onToggle = vi.fn()
      render(<ViewToggle activeViews={['inbox', 'planner', 'board']} onToggle={onToggle} />)

      fireEvent.click(screen.getByRole('button', { name: /inbox/i }))

      expect(onToggle).toHaveBeenCalledTimes(1)
      expect(onToggle).toHaveBeenCalledWith('inbox')
    })

    it('should allow toggling when the clicked view is not currently active (adding it)', () => {
      const onToggle = vi.fn()
      render(<ViewToggle activeViews={['inbox', 'planner']} onToggle={onToggle} />)

      fireEvent.click(screen.getByRole('button', { name: /board/i }))

      expect(onToggle).toHaveBeenCalledTimes(1)
      expect(onToggle).toHaveBeenCalledWith('board')
    })

    it('should not call onToggle when trying to deselect the only active view', () => {
      const onToggle = vi.fn()
      render(<ViewToggle activeViews={['inbox']} onToggle={onToggle} />)

      fireEvent.click(screen.getByRole('button', { name: /inbox/i }))

      expect(onToggle).not.toHaveBeenCalled()
    })

    it('should allow toggling off when two views are active', () => {
      const onToggle = vi.fn()
      render(<ViewToggle activeViews={['inbox', 'planner']} onToggle={onToggle} />)

      fireEvent.click(screen.getByRole('button', { name: /inbox/i }))

      expect(onToggle).toHaveBeenCalledTimes(1)
      expect(onToggle).toHaveBeenCalledWith('inbox')
    })
  })

  describe('Visual Styling', () => {
    it('should apply active styles to active buttons', () => {
      render(<ViewToggle {...defaultProps} activeViews={['inbox']} />)

      const inboxButton = screen.getByRole('button', { name: /inbox/i })
      expect(inboxButton).toHaveClass('bg-primary')
      expect(inboxButton).toHaveClass('text-primary-foreground')
    })

    it('should apply inactive styles to inactive buttons', () => {
      render(<ViewToggle {...defaultProps} activeViews={['inbox']} />)

      const plannerButton = screen.getByRole('button', { name: /planner/i })
      expect(plannerButton).toHaveClass('bg-transparent')
    })

    it('should have pill-shaped buttons', () => {
      render(<ViewToggle {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('rounded-full')
      })
    })

    it('should have transition animations', () => {
      render(<ViewToggle {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('transition-all')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria-pressed attribute', () => {
      render(<ViewToggle {...defaultProps} activeViews={['inbox', 'planner']} />)

      expect(screen.getByRole('button', { name: /inbox/i })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: /planner/i })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: /board/i })).toHaveAttribute('aria-pressed', 'false')
    })

    it('should have role group for the container', () => {
      render(<ViewToggle {...defaultProps} />)

      const container = screen.getByTestId('view-toggle')
      expect(container).toHaveAttribute('role', 'group')
    })

    it('should have aria-label for accessibility', () => {
      render(<ViewToggle {...defaultProps} />)

      const container = screen.getByTestId('view-toggle')
      expect(container).toHaveAttribute('aria-label', 'View toggle')
    })
  })

  describe('Custom className', () => {
    it('should accept custom className prop', () => {
      render(<ViewToggle {...defaultProps} className="custom-class" />)

      const container = screen.getByTestId('view-toggle')
      expect(container).toHaveClass('custom-class')
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid clicks gracefully', () => {
      const onToggle = vi.fn()
      render(<ViewToggle activeViews={['inbox', 'planner']} onToggle={onToggle} />)

      const inboxButton = screen.getByRole('button', { name: /inbox/i })
      fireEvent.click(inboxButton)
      fireEvent.click(inboxButton)
      fireEvent.click(inboxButton)

      expect(onToggle).toHaveBeenCalledTimes(3)
    })

    it('should handle empty activeViews array', () => {
      const onToggle = vi.fn()
      render(<ViewToggle activeViews={[]} onToggle={onToggle} />)

      // Clicking any button should add that view
      fireEvent.click(screen.getByRole('button', { name: /inbox/i }))
      expect(onToggle).toHaveBeenCalledWith('inbox')
    })
  })

  describe('ViewType Type Safety', () => {
    it('should only accept valid view types', () => {
      // This test ensures TypeScript type checking
      const validViews: ViewType[] = ['inbox', 'planner', 'board']
      expect(validViews).toHaveLength(3)
    })
  })
})