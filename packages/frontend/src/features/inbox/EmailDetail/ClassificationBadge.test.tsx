import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClassificationBadge } from './ClassificationBadge'
import type { EmailClassification } from '@nanomail/shared'

describe('ClassificationBadge', () => {
  describe('label rendering', () => {
    it('displays "Important" for IMPORTANT classification', () => {
      render(<ClassificationBadge classification="IMPORTANT" />)
      expect(screen.getByText('Important')).toBeInTheDocument()
    })

    it('displays "Newsletter" for NEWSLETTER classification', () => {
      render(<ClassificationBadge classification="NEWSLETTER" />)
      expect(screen.getByText('Newsletter')).toBeInTheDocument()
    })

    it('displays "Spam" for SPAM classification', () => {
      render(<ClassificationBadge classification="SPAM" />)
      expect(screen.getByText('Spam')).toBeInTheDocument()
    })
  })

  describe('color schemes', () => {
    it('uses red color scheme for IMPORTANT', () => {
      const { container } = render(<ClassificationBadge classification="IMPORTANT" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-red-100')
      expect(badge.className).toContain('text-red-700')
    })

    it('uses blue color scheme for NEWSLETTER', () => {
      const { container } = render(<ClassificationBadge classification="NEWSLETTER" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-blue-100')
      expect(badge.className).toContain('text-blue-700')
    })

    it('uses gray color scheme for SPAM', () => {
      const { container } = render(<ClassificationBadge classification="SPAM" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-gray-100')
      expect(badge.className).toContain('text-gray-600')
    })
  })

  describe('className prop', () => {
    it('accepts optional className prop for customization', () => {
      const { container } = render(
        <ClassificationBadge classification="IMPORTANT" className="custom-class" />
      )
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('custom-class')
    })

    it('merges custom className with default classes', () => {
      const { container } = render(
        <ClassificationBadge classification="NEWSLETTER" className="ml-2" />
      )
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('ml-2')
      expect(badge.className).toContain('bg-blue-100')
    })
  })

  describe('styling', () => {
    it('has rounded-full class', () => {
      const { container } = render(<ClassificationBadge classification="IMPORTANT" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('rounded-full')
    })

    it('has appropriate padding', () => {
      const { container } = render(<ClassificationBadge classification="IMPORTANT" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('px-2')
      expect(badge.className).toContain('py-0.5')
    })

    it('has small text size', () => {
      const { container } = render(<ClassificationBadge classification="IMPORTANT" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('text-xs')
    })

    it('has font-medium class', () => {
      const { container } = render(<ClassificationBadge classification="IMPORTANT" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('font-medium')
    })
  })

  describe('type safety', () => {
    it('accepts all valid EmailClassification values', () => {
      const classifications: EmailClassification[] = ['IMPORTANT', 'NEWSLETTER', 'SPAM']

      classifications.forEach((classification) => {
        const { unmount } = render(<ClassificationBadge classification={classification} />)
        expect(screen.getByRole('span')).toBeInTheDocument()
        unmount()
      })
    })
  })
})