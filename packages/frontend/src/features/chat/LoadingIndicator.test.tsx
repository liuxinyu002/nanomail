import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingIndicator, LoadingIndicatorIcon } from './LoadingIndicator'

describe('LoadingIndicator', () => {
  describe('LoadingIndicator (blinking cursor)', () => {
    it('should render a blinking cursor element', () => {
      render(<LoadingIndicator />)

      const indicator = screen.getByLabelText('AI is thinking')
      expect(indicator).toBeInTheDocument()
    })

    it('should have correct dimensions for cursor', () => {
      render(<LoadingIndicator />)

      const indicator = screen.getByLabelText('AI is thinking')
      // Check that it has the cursor-like dimensions (width: 2, height: 5)
      expect(indicator).toHaveClass('w-2', 'h-5')
    })

    it('should have pulse animation class', () => {
      render(<LoadingIndicator />)

      const indicator = screen.getByLabelText('AI is thinking')
      expect(indicator).toHaveClass('animate-pulse')
    })

    it('should be an inline element', () => {
      render(<LoadingIndicator />)

      const indicator = screen.getByLabelText('AI is thinking')
      expect(indicator).toHaveClass('inline-block')
    })

    it('should have dark background color', () => {
      render(<LoadingIndicator />)

      const indicator = screen.getByLabelText('AI is thinking')
      expect(indicator).toHaveClass('bg-gray-800')
    })
  })

  describe('LoadingIndicatorIcon (alternative)', () => {
    it('should render with icon and text', () => {
      render(<LoadingIndicatorIcon />)

      expect(screen.getByText('Thinking...')).toBeInTheDocument()
    })

    it('should have pulsing icon', () => {
      const { container } = render(<LoadingIndicatorIcon />)

      const icon = container.querySelector('.animate-pulse')
      expect(icon).toBeInTheDocument()
    })

    it('should have correct text styling', () => {
      render(<LoadingIndicatorIcon />)

      const text = screen.getByText('Thinking...')
      expect(text).toHaveClass('text-sm')
    })

    it('should be a flex container with gap', () => {
      const { container } = render(<LoadingIndicatorIcon />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('flex', 'items-center', 'gap-2')
    })

    it('should have muted text color', () => {
      const { container } = render(<LoadingIndicatorIcon />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('text-gray-500')
    })
  })
})
