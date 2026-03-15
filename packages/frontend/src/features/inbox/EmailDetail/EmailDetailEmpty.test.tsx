import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmailDetailEmpty } from './EmailDetailEmpty'

describe('EmailDetailEmpty', () => {
  describe('default rendering', () => {
    it('renders centered layout container', () => {
      const { container } = render(<EmailDetailEmpty />)
      const outerDiv = container.firstChild as HTMLElement
      expect(outerDiv.className).toContain('flex')
      expect(outerDiv.className).toContain('items-center')
      expect(outerDiv.className).toContain('justify-center')
    })

    it('renders Mail icon', () => {
      render(<EmailDetailEmpty />)
      // Mail icon should be present (lucide-react icons have specific structure)
      const icon = document.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('lucide', 'lucide-mail')
    })

    it('renders default message when no message prop', () => {
      render(<EmailDetailEmpty />)
      expect(screen.getByText('Select an email from the list')).toBeInTheDocument()
    })
  })

  describe('custom message', () => {
    it('renders custom message when message prop provided', () => {
      render(<EmailDetailEmpty message="Email not found" />)
      expect(screen.getByText('Email not found')).toBeInTheDocument()
    })

    it('does not render default message when custom message provided', () => {
      render(<EmailDetailEmpty message="No emails available" />)
      expect(screen.queryByText('Select an email from the list')).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('icon has correct size (h-12 w-12)', () => {
      render(<EmailDetailEmpty />)
      const icon = document.querySelector('svg')
      expect(icon).toHaveClass('h-12', 'w-12')
    })

    it('icon has gray-300 color', () => {
      render(<EmailDetailEmpty />)
      const icon = document.querySelector('svg')
      expect(icon).toHaveClass('text-gray-300')
    })

    it('text has gray-400 color', () => {
      render(<EmailDetailEmpty />)
      const text = screen.getByText('Select an email from the list')
      expect(text).toHaveClass('text-gray-400')
    })

    it('container has full height', () => {
      const { container } = render(<EmailDetailEmpty />)
      const outerDiv = container.firstChild as HTMLElement
      expect(outerDiv.className).toContain('h-full')
    })
  })
})