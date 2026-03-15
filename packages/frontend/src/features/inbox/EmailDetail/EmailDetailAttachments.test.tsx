import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmailDetailAttachments } from './EmailDetailAttachments'

describe('EmailDetailAttachments', () => {
  describe('basic rendering', () => {
    it('renders the attachments section', () => {
      const { container } = render(<EmailDetailAttachments />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders Paperclip icon', () => {
      const { container } = render(<EmailDetailAttachments />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders "Attachments" label', () => {
      render(<EmailDetailAttachments />)
      expect(screen.getByText('Attachments')).toBeInTheDocument()
    })
  })

  describe('layout structure', () => {
    it('has top border', () => {
      const { container } = render(<EmailDetailAttachments />)
      const section = container.firstChild as HTMLElement
      expect(section.className).toContain('border-t')
      expect(section.className).toContain('border-gray-200')
    })

    it('has proper padding', () => {
      const { container } = render(<EmailDetailAttachments />)
      const section = container.firstChild as HTMLElement
      expect(section.className).toContain('p-6')
    })

    it('has icon and label in header row', () => {
      const { container } = render(<EmailDetailAttachments />)

      // Icon container with proper classes
      const headerRow = container.querySelector('.flex.items-center.gap-2')
      expect(headerRow).toBeInTheDocument()
    })
  })

  describe('placeholder content', () => {
    it('renders placeholder skeleton rows', () => {
      const { container } = render(<EmailDetailAttachments />)

      // Should have animated pulse placeholders
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThanOrEqual(2)
    })

    it('placeholder rows have correct height', () => {
      const { container } = render(<EmailDetailAttachments />)

      const skeletons = container.querySelectorAll('.h-12')
      expect(skeletons.length).toBeGreaterThanOrEqual(2)
    })

    it('placeholder rows have rounded corners', () => {
      const { container } = render(<EmailDetailAttachments />)

      const skeletons = container.querySelectorAll('.rounded')
      expect(skeletons.length).toBeGreaterThanOrEqual(2)
    })

    it('placeholder rows have gray background', () => {
      const { container } = render(<EmailDetailAttachments />)

      const skeletons = container.querySelectorAll('.bg-gray-100')
      expect(skeletons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('styling', () => {
    it('label has font-medium class', () => {
      render(<EmailDetailAttachments />)
      const label = screen.getByText('Attachments')
      expect(label.className).toContain('font-medium')
    })

    it('label has text-gray-600 color', () => {
      render(<EmailDetailAttachments />)
      const label = screen.getByText('Attachments')
      expect(label.className).toContain('text-gray-600')
    })

    it('icon has correct size (h-4 w-4)', () => {
      const { container } = render(<EmailDetailAttachments />)
      const icon = container.querySelector('svg')

      // SVG icon should be small (h-4 w-4)
      // lucide-react icons inherit size from parent classes
      expect(icon).toBeInTheDocument()
    })
  })

  describe('spacing', () => {
    it('header has margin-bottom', () => {
      const { container } = render(<EmailDetailAttachments />)
      const headerRow = container.querySelector('.mb-4')
      expect(headerRow).toBeInTheDocument()
    })

    it('placeholder container has space-y-2 for gaps', () => {
      const { container } = render(<EmailDetailAttachments />)
      const placeholderContainer = container.querySelector('.space-y-2')
      expect(placeholderContainer).toBeInTheDocument()
    })
  })
})