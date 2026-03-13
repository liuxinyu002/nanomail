import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmailCard, type EmailCardProps } from './EmailCard'

describe('EmailCard', () => {
  const mockEmail: EmailCardProps['email'] = {
    id: 1,
    sender: 'test@example.com',
    subject: 'Test Subject',
    snippet: 'This is a test email snippet that should be truncated...',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    isProcessed: false,
    classification: 'IMPORTANT',
    summary: null,
  }

  const mockOnSelect = vi.fn()

  beforeEach(() => {
    mockOnSelect.mockClear()
  })

  describe('Rendering', () => {
    it('should render sender email', () => {
      render(<EmailCard email={mockEmail} selected={false} onSelect={mockOnSelect} />)

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should render subject', () => {
      render(<EmailCard email={mockEmail} selected={false} onSelect={mockOnSelect} />)

      expect(screen.getByText('Test Subject')).toBeInTheDocument()
    })

    it('should render snippet with line-clamp-2', () => {
      render(<EmailCard email={mockEmail} selected={false} onSelect={mockOnSelect} />)

      const snippet = screen.getByText(/This is a test email snippet/)
      expect(snippet).toHaveClass('line-clamp-2')
    })

    it('should render relative date', () => {
      render(<EmailCard email={mockEmail} selected={false} onSelect={mockOnSelect} />)

      // Date should be formatted relatively (e.g., "2 days ago")
      const dateElement = screen.getByText(/ago|today|yesterday/i)
      expect(dateElement).toBeInTheDocument()
    })

    it('should show checkbox', () => {
      render(<EmailCard email={mockEmail} selected={false} onSelect={mockOnSelect} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
    })

    it('should show processed indicator for processed emails without summary', () => {
      const processedEmail = { ...mockEmail, isProcessed: true, summary: null }
      render(<EmailCard email={processedEmail} selected={false} onSelect={mockOnSelect} />)

      // Processed emails without summary should have visual indicator
      expect(screen.getByTestId('processed-indicator')).toBeInTheDocument()
    })

    it('should visually mute spam emails', () => {
      const spamEmail = { ...mockEmail, classification: 'SPAM' as const }
      const { container } = render(<EmailCard email={spamEmail} selected={false} onSelect={mockOnSelect} />)

      const card = container.firstChild
      expect(card).toHaveClass('opacity-60')
    })
  })

  describe('Selection', () => {
    it('should show checkbox as checked when selected', () => {
      render(<EmailCard email={mockEmail} selected={true} onSelect={mockOnSelect} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should show checkbox as unchecked when not selected', () => {
      render(<EmailCard email={mockEmail} selected={false} onSelect={mockOnSelect} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('should call onSelect when checkbox is clicked', () => {
      render(<EmailCard email={mockEmail} selected={false} onSelect={mockOnSelect} />)

      fireEvent.click(screen.getByRole('checkbox'))

      expect(mockOnSelect).toHaveBeenCalledWith(1)
    })
  })

  describe('Selection Disabled (Poka-yoke)', () => {
    it('should disable checkbox when selectionDisabled is true and not selected', () => {
      render(<EmailCard email={mockEmail} selected={false} onSelect={mockOnSelect} selectionDisabled={true} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeDisabled()
    })

    it('should allow interaction when selectionDisabled but already selected', () => {
      render(<EmailCard email={mockEmail} selected={true} onSelect={mockOnSelect} selectionDisabled={true} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeDisabled()

      fireEvent.click(checkbox)
      expect(mockOnSelect).toHaveBeenCalledWith(1)
    })
  })

  describe('Summary Folding', () => {
    describe('Sparkles Indicator', () => {
      it('should show Sparkles indicator for unprocessed emails', () => {
        render(<EmailCard email={mockEmail} selected={false} onSelect={mockOnSelect} />)

        expect(screen.getByTestId('sparkles-indicator')).toBeInTheDocument()
      })

      it('should not show Sparkles indicator for processed emails', () => {
        const processedEmail = { ...mockEmail, isProcessed: true, summary: null }
        render(<EmailCard email={processedEmail} selected={false} onSelect={mockOnSelect} />)

        expect(screen.queryByTestId('sparkles-indicator')).not.toBeInTheDocument()
      })
    })

    describe('Expand/Collapse Behavior', () => {
      it('should show expand icon for processed emails with summary', () => {
        const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary' }
        render(<EmailCard email={emailWithSummary} selected={false} onSelect={mockOnSelect} />)

        expect(screen.getByTestId('expand-trigger')).toBeInTheDocument()
      })

      it('should not show expand icon for emails without summary', () => {
        const processedEmail = { ...mockEmail, isProcessed: true, summary: null }
        render(<EmailCard email={processedEmail} selected={false} onSelect={mockOnSelect} />)

        expect(screen.queryByTestId('expand-trigger')).not.toBeInTheDocument()
      })

      it('should expand and show summary when clicking card body', () => {
        const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary content' }
        render(<EmailCard email={emailWithSummary} selected={false} onSelect={mockOnSelect} />)

        // Summary should not be visible initially
        expect(screen.queryByText('Test summary content')).not.toBeInTheDocument()

        // Click on the card body (the content div)
        fireEvent.click(screen.getByText('Test Subject'))

        // Summary should now be visible
        expect(screen.getByText('Test summary content')).toBeInTheDocument()
      })

      it('should collapse when clicking card body again', () => {
        const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary content' }
        render(<EmailCard email={emailWithSummary} selected={false} onSelect={mockOnSelect} />)

        // Expand
        fireEvent.click(screen.getByText('Test Subject'))
        expect(screen.getByText('Test summary content')).toBeInTheDocument()

        // Collapse
        fireEvent.click(screen.getByText('Test Subject'))
        expect(screen.queryByText('Test summary content')).not.toBeInTheDocument()
      })

      it('should not trigger selection when clicking card body', () => {
        const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary' }
        render(<EmailCard email={emailWithSummary} selected={false} onSelect={mockOnSelect} />)

        fireEvent.click(screen.getByText('Test Subject'))

        expect(mockOnSelect).not.toHaveBeenCalled()
      })

      it('should trigger selection when clicking checkbox', () => {
        const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary' }
        render(<EmailCard email={emailWithSummary} selected={false} onSelect={mockOnSelect} />)

        fireEvent.click(screen.getByRole('checkbox'))

        expect(mockOnSelect).toHaveBeenCalledWith(1)
      })
    })

    describe('Default State', () => {
      it('should be collapsed by default', () => {
        const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary' }
        render(<EmailCard email={emailWithSummary} selected={false} onSelect={mockOnSelect} />)

        expect(screen.queryByText('Test summary')).not.toBeInTheDocument()
      })
    })
  })
})