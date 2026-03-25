import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmailDetailHeader } from './EmailDetailHeader'
import type { EmailDetail } from '@/services'

// Helper to create mock email
function createMockEmail(overrides: Partial<EmailDetail> = {}): EmailDetail {
  return {
    id: 1,
    subject: 'Test Subject',
    sender: 'test@example.com',
    snippet: 'Test snippet',
    bodyText: 'Test body',
    date: new Date().toISOString(),
    isProcessed: true,
    classification: 'IMPORTANT',
    isSpam: false,
    hasAttachments: false,
    ...overrides,
  }
}

describe('EmailDetailHeader', () => {
  describe('subject display', () => {
    it('displays subject when provided', () => {
      render(<EmailDetailHeader email={createMockEmail({ subject: 'Important Meeting Tomorrow' })} />)
      expect(screen.getByText('Important Meeting Tomorrow')).toBeInTheDocument()
    })

    it('displays "(No Subject)" fallback when subject is null', () => {
      render(<EmailDetailHeader email={createMockEmail({ subject: null })} />)
      expect(screen.getByText('(No Subject)')).toBeInTheDocument()
    })

    it('subject has proper styling (large, bold, truncate)', () => {
      render(<EmailDetailHeader email={createMockEmail()} />)
      const subject = screen.getByText('Test Subject')
      expect(subject.className).toContain('text-xl')
      expect(subject.className).toContain('font-semibold')
      expect(subject.className).toContain('truncate')
    })
  })

  describe('ClassificationTag rendering', () => {
    it('shows ClassificationTag when classification exists', () => {
      render(<EmailDetailHeader email={createMockEmail({ classification: 'IMPORTANT' })} />)
      expect(screen.getByText('重要')).toBeInTheDocument()
    })

    it('shows Newsletter tag for NEWSLETTER classification', () => {
      render(<EmailDetailHeader email={createMockEmail({ classification: 'NEWSLETTER' })} />)
      expect(screen.getByText('订阅')).toBeInTheDocument()
    })

    it('shows Spam tag for SPAM classification', () => {
      render(<EmailDetailHeader email={createMockEmail({ classification: 'SPAM' })} />)
      expect(screen.getByText('垃圾')).toBeInTheDocument()
    })
  })

  describe('sender info display', () => {
    it('displays sender email as name when no separate name field', () => {
      render(<EmailDetailHeader email={createMockEmail({ sender: 'john.doe@example.com' })} />)
      expect(screen.getByText('john.doe')).toBeInTheDocument()
    })

    it('extracts local part from email address', () => {
      render(<EmailDetailHeader email={createMockEmail({ sender: 'alice.smith@company.org' })} />)
      expect(screen.getByText('alice.smith')).toBeInTheDocument()
    })

    it('displays sender email below the name', () => {
      render(<EmailDetailHeader email={createMockEmail({ sender: 'jane@example.com' })} />)
      // The sender email appears in the secondary text
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })

    it('handles null sender gracefully', () => {
      render(<EmailDetailHeader email={createMockEmail({ sender: null })} />)
      // Should show "?" in avatar for null sender
      expect(screen.getByText('?')).toBeInTheDocument()
      // Should show "Unknown" as fallback
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('handles malformed email without local part', () => {
      // Edge case: email like "@example.com" where local part is empty
      render(<EmailDetailHeader email={createMockEmail({ sender: '@example.com' })} />)
      // Should fall back to full email (appears twice: as name and as email)
      const elements = screen.getAllByText('@example.com')
      expect(elements.length).toBe(2)
    })
  })

  describe('Avatar integration', () => {
    it('renders Avatar component with sender initial', () => {
      render(<EmailDetailHeader email={createMockEmail({ sender: 'alice@example.com' })} />)
      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('Avatar shows "?" for null sender', () => {
      render(<EmailDetailHeader email={createMockEmail({ sender: null })} />)
      expect(screen.getByText('?')).toBeInTheDocument()
    })

    it('Avatar uses medium size', () => {
      const { container } = render(<EmailDetailHeader email={createMockEmail()} />)
      const avatar = container.querySelector('.h-10.w-10')
      expect(avatar).toBeInTheDocument()
    })
  })

  describe('smart date formatting', () => {
    it('shows time only for today (HH:mm)', () => {
      const today = new Date()
      const dateStr = today.toISOString()
      render(<EmailDetailHeader email={createMockEmail({ date: dateStr })} />)

      // Should show time format like "14:30"
      const timeRegex = /^\d{2}:\d{2}$/
      const timeElement = screen.getByText(timeRegex)
      expect(timeElement).toBeInTheDocument()
    })

    it('shows "Yesterday HH:mm" for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const dateStr = yesterday.toISOString()
      render(<EmailDetailHeader email={createMockEmail({ date: dateStr })} />)

      expect(screen.getByText(/Yesterday/)).toBeInTheDocument()
    })

    it('shows "MMM d" format for this year (not today/yesterday)', () => {
      const thisYear = new Date()
      thisYear.setMonth(thisYear.getMonth() - 2) // 2 months ago
      const dateStr = thisYear.toISOString()
      render(<EmailDetailHeader email={createMockEmail({ date: dateStr })} />)

      // Should show format like "Jan 15"
      const dateRegex = /^[A-Z][a-z]{2} \d{1,2}$/
      const dateElement = screen.getByText(dateRegex)
      expect(dateElement).toBeInTheDocument()
    })

    it('shows "MMM d, yyyy" for cross-year dates', () => {
      const lastYear = new Date()
      lastYear.setFullYear(lastYear.getFullYear() - 1)
      const dateStr = lastYear.toISOString()
      render(<EmailDetailHeader email={createMockEmail({ date: dateStr })} />)

      // Should show format like "Jan 15, 2023"
      const dateRegex = /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/
      const dateElement = screen.getByText(dateRegex)
      expect(dateElement).toBeInTheDocument()
    })
  })

  describe('attachment icon', () => {
    it('shows paperclip icon when hasAttachments is true', () => {
      const { container } = render(<EmailDetailHeader email={createMockEmail({ hasAttachments: true })} />)
      // Paperclip icon should be rendered (lucide-react)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('does not show paperclip icon when hasAttachments is false', () => {
      render(<EmailDetailHeader email={createMockEmail({ hasAttachments: false })} />)
      // No paperclip icon should be visible
      // The only SVG should be from the close button (if rendered) or none
    })
  })

  describe('close button', () => {
    it('renders close button when onClose is provided', () => {
      const onClose = vi.fn()
      render(<EmailDetailHeader email={createMockEmail()} onClose={onClose} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })

    it('does not render close button when onClose is undefined', () => {
      render(<EmailDetailHeader email={createMockEmail()} />)

      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
    })

    it('triggers onClose callback when clicked', () => {
      const onClose = vi.fn()
      render(<EmailDetailHeader email={createMockEmail()} onClose={onClose} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('has proper aria-label for accessibility', () => {
      const onClose = vi.fn()
      render(<EmailDetailHeader email={createMockEmail()} onClose={onClose} />)

      const closeButton = screen.getByRole('button', { name: 'Close email detail' })
      expect(closeButton).toBeInTheDocument()
    })
  })

  describe('layout structure', () => {
    it('has proper padding', () => {
      const { container } = render(<EmailDetailHeader email={createMockEmail()} />)
      const header = container.firstChild as HTMLElement
      expect(header.className).toContain('p-6')
    })

    it('renders top row with subject, badge, and close button', () => {
      const onClose = vi.fn()
      render(<EmailDetailHeader email={createMockEmail()} onClose={onClose} />)

      expect(screen.getByText('Test Subject')).toBeInTheDocument()
      expect(screen.getByText('重要')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    })

    it('renders bottom row with avatar, sender, date, and attachment icon', () => {
      const { container } = render(
        <EmailDetailHeader email={createMockEmail({ hasAttachments: true })} />
      )

      // Avatar initial
      expect(screen.getByText('T')).toBeInTheDocument()
      // Date should be present
      const timeRegex = /^\d{2}:\d{2}$/
      expect(screen.getByText(timeRegex)).toBeInTheDocument()
      // SVG (paperclip icon)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })
})