import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmailDetailBody } from './EmailDetailBody'

describe('EmailDetailBody', () => {
  describe('text rendering', () => {
    it('displays body text when provided', () => {
      render(<EmailDetailBody bodyText="This is the email body content." />)
      expect(screen.getByText('This is the email body content.')).toBeInTheDocument()
    })

    it('displays "(No content)" fallback when bodyText is null', () => {
      render(<EmailDetailBody bodyText={null} />)
      expect(screen.getByText('(No content)')).toBeInTheDocument()
    })

    it('displays "(No content)" fallback when bodyText is empty string', () => {
      render(<EmailDetailBody bodyText="" />)
      expect(screen.getByText('(No content)')).toBeInTheDocument()
    })
  })

  describe('line break preservation', () => {
    it('preserves line breaks with whitespace-pre-wrap', () => {
      const { container } = render(
        <EmailDetailBody bodyText="Line 1\nLine 2\nLine 3" />
      )

      const textContainer = container.querySelector('.whitespace-pre-wrap')
      expect(textContainer).toBeInTheDocument()
    })

    it('renders multi-line text correctly', () => {
      const multiLineText = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.'
      render(<EmailDetailBody bodyText={multiLineText} />)

      // The text should be rendered with line breaks preserved
      const textElement = screen.getByText(/First paragraph/)
      expect(textElement).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has proper text color (gray-700)', () => {
      const { container } = render(<EmailDetailBody bodyText="Test content" />)
      const textContainer = container.querySelector('.text-gray-700')
      expect(textContainer).toBeInTheDocument()
    })

    it('has relaxed line height', () => {
      const { container } = render(<EmailDetailBody bodyText="Test content" />)
      const textContainer = container.querySelector('.leading-relaxed')
      expect(textContainer).toBeInTheDocument()
    })

    it('uses system font family via font-sans class', () => {
      const { container } = render(<EmailDetailBody bodyText="Test content" />)
      const textContainer = container.querySelector('.font-sans')
      expect(textContainer).toBeInTheDocument()
    })
  })

  describe('container layout', () => {
    it('has flex-1 for flexible sizing', () => {
      const { container } = render(<EmailDetailBody bodyText="Test" />)
      const outerContainer = container.firstChild as HTMLElement
      expect(outerContainer.className).toContain('flex-1')
    })

    it('has overflow-y-auto for scrolling', () => {
      const { container } = render(<EmailDetailBody bodyText="Test" />)
      const outerContainer = container.firstChild as HTMLElement
      expect(outerContainer.className).toContain('overflow-y-auto')
    })

    it('has proper padding', () => {
      const { container } = render(<EmailDetailBody bodyText="Test" />)
      const outerContainer = container.firstChild as HTMLElement
      expect(outerContainer.className).toContain('p-6')
    })
  })

  describe('long content handling', () => {
    it('renders long text content', () => {
      const longText = 'A'.repeat(10000)
      render(<EmailDetailBody bodyText={longText} />)

      // Should render without truncation
      const textElement = screen.getByText(/^A+$/)
      expect(textElement).toBeInTheDocument()
    })

    it('container is scrollable for overflow content', () => {
      const { container } = render(<EmailDetailBody bodyText="Test content" />)
      const outerContainer = container.firstChild as HTMLElement

      // Should have overflow-y-auto class for scrolling
      expect(outerContainer.className).toContain('overflow-y-auto')
    })
  })
})