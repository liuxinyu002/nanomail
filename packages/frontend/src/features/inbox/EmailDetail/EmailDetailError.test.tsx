import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmailDetailError } from './EmailDetailError'

describe('EmailDetailError', () => {
  describe('rendering', () => {
    it('renders centered layout container', () => {
      const { container } = render(<EmailDetailError onRetry={() => {}} />)
      const outerDiv = container.firstChild as HTMLElement
      expect(outerDiv.className).toContain('flex')
      expect(outerDiv.className).toContain('items-center')
      expect(outerDiv.className).toContain('justify-center')
    })

    it('renders AlertTriangle icon', () => {
      render(<EmailDetailError onRetry={() => {}} />)
      const icon = document.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('lucide', 'lucide-triangle-alert')
    })

    it('renders error message', () => {
      render(<EmailDetailError onRetry={() => {}} />)
      expect(screen.getByText('Failed to load email')).toBeInTheDocument()
    })

    it('renders Retry button', () => {
      render(<EmailDetailError onRetry={() => {}} />)
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('Retry button triggers onRetry callback', () => {
      const onRetry = vi.fn()
      render(<EmailDetailError onRetry={onRetry} />)

      const retryButton = screen.getByRole('button', { name: 'Retry' })
      fireEvent.click(retryButton)

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('Retry button can be clicked multiple times', () => {
      const onRetry = vi.fn()
      render(<EmailDetailError onRetry={onRetry} />)

      const retryButton = screen.getByRole('button', { name: 'Retry' })
      fireEvent.click(retryButton)
      fireEvent.click(retryButton)

      expect(onRetry).toHaveBeenCalledTimes(2)
    })
  })

  describe('styling', () => {
    it('icon has correct size (h-12 w-12)', () => {
      render(<EmailDetailError onRetry={() => {}} />)
      const icon = document.querySelector('svg')
      expect(icon).toHaveClass('h-12', 'w-12')
    })

    it('icon has low saturation color (text-gray-300)', () => {
      render(<EmailDetailError onRetry={() => {}} />)
      const icon = document.querySelector('svg')
      expect(icon).toHaveClass('text-gray-300')
    })

    it('error message has gray-500 color', () => {
      render(<EmailDetailError onRetry={() => {}} />)
      const message = screen.getByText('Failed to load email')
      expect(message).toHaveClass('text-gray-500')
    })

    it('container has full height', () => {
      const { container } = render(<EmailDetailError onRetry={() => {}} />)
      const outerDiv = container.firstChild as HTMLElement
      expect(outerDiv.className).toContain('h-full')
    })

    it('Retry button has ghost variant', () => {
      render(<EmailDetailError onRetry={() => {}} />)
      const button = screen.getByRole('button', { name: 'Retry' })
      // Ghost variant adds hover:bg-accent class
      expect(button.className).toMatch(/hover:bg-accent/)
    })
  })
})