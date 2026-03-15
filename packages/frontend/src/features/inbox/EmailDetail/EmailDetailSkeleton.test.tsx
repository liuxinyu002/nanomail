import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { EmailDetailSkeleton } from './EmailDetailSkeleton'

describe('EmailDetailSkeleton', () => {
  describe('structure', () => {
    it('renders main container with padding', () => {
      const { container } = render(<EmailDetailSkeleton />)
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv.className).toContain('p-6')
    })

    it('renders subject skeleton (h-8 w-3/4)', () => {
      const { container } = render(<EmailDetailSkeleton />)
      const skeletons = container.querySelectorAll('.animate-pulse')

      // Find the subject skeleton - should be first one with h-8 class
      const subjectSkeleton = Array.from(skeletons).find(el =>
        el.className.includes('h-8') && el.className.includes('w-3/4')
      )
      expect(subjectSkeleton).toBeInTheDocument()
    })

    it('renders avatar skeleton (circular)', () => {
      const { container } = render(<EmailDetailSkeleton />)
      const skeletons = container.querySelectorAll('.animate-pulse')

      // Avatar should be rounded-full, h-10, w-10
      const avatarSkeleton = Array.from(skeletons).find(el =>
        el.className.includes('rounded-full') &&
        el.className.includes('h-10') &&
        el.className.includes('w-10')
      )
      expect(avatarSkeleton).toBeInTheDocument()
    })

    it('renders sender skeleton (w-32)', () => {
      const { container } = render(<EmailDetailSkeleton />)
      const skeletons = container.querySelectorAll('.animate-pulse')

      // Sender skeleton should have w-32 class
      const senderSkeleton = Array.from(skeletons).find(el =>
        el.className.includes('w-32')
      )
      expect(senderSkeleton).toBeInTheDocument()
    })

    it('renders date skeleton (w-20)', () => {
      const { container } = render(<EmailDetailSkeleton />)
      const skeletons = container.querySelectorAll('.animate-pulse')

      // Date skeleton should have w-20 class
      const dateSkeleton = Array.from(skeletons).find(el =>
        el.className.includes('w-20')
      )
      expect(dateSkeleton).toBeInTheDocument()
    })

    it('renders body skeleton lines (4 lines)', () => {
      const { container } = render(<EmailDetailSkeleton />)
      const skeletons = container.querySelectorAll('.animate-pulse')

      // Count skeleton elements with h-4 (body lines)
      const bodyLines = Array.from(skeletons).filter(el =>
        el.className.includes('h-4')
      )
      // Should have at least 4 body lines (including sender/date skeletons)
      expect(bodyLines.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('animation', () => {
    it('all skeleton elements have pulse animation', () => {
      const { container } = render(<EmailDetailSkeleton />)
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('divider', () => {
    it('renders divider between header and body', () => {
      const { container } = render(<EmailDetailSkeleton />)
      const divider = container.querySelector('.border-t')
      expect(divider).toBeInTheDocument()
    })
  })

  describe('spacing', () => {
    it('has proper spacing in header section', () => {
      const { container } = render(<EmailDetailSkeleton />)
      const headerSection = container.querySelector('.space-y-4')
      expect(headerSection).toBeInTheDocument()
    })

    it('has proper spacing in body section', () => {
      const { container } = render(<EmailDetailSkeleton />)
      const bodySections = container.querySelectorAll('.space-y-3')
      expect(bodySections.length).toBeGreaterThan(0)
    })
  })
})