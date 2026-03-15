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

  describe('Active State', () => {
    it('should apply active styling when email.id matches activeId', () => {
      const { container } = render(
        <EmailCard
          email={mockEmail}
          selected={false}
          onSelect={mockOnSelect}
          activeId={1}
        />
      )

      const card = container.firstChild
      expect(card).toHaveClass('border-l-4')
      expect(card).toHaveClass('border-l-blue-600')
      expect(card).toHaveClass('bg-blue-50')
    })

    it('should not apply active styling when email.id does not match activeId', () => {
      const { container } = render(
        <EmailCard
          email={mockEmail}
          selected={false}
          onSelect={mockOnSelect}
          activeId={999}
        />
      )

      const card = container.firstChild
      expect(card).not.toHaveClass('border-l-4')
      expect(card).not.toHaveClass('border-l-blue-600')
    })

    it('should show active left border even when selected (states coexist)', () => {
      const { container } = render(
        <EmailCard
          email={mockEmail}
          selected={true}
          onSelect={mockOnSelect}
          activeId={1}
        />
      )

      const card = container.firstChild
      // Selected background should take priority
      expect(card).toHaveClass('bg-primary/10')
      // Active left border should still show
      expect(card).toHaveClass('border-l-4')
      expect(card).toHaveClass('border-l-blue-600')
    })

    it('should not apply active styling when activeId is undefined', () => {
      const { container } = render(
        <EmailCard
          email={mockEmail}
          selected={false}
          onSelect={mockOnSelect}
          activeId={undefined}
        />
      )

      const card = container.firstChild
      expect(card).not.toHaveClass('border-l-4')
      expect(card).not.toHaveClass('bg-blue-50')
    })

    it('should not apply active styling when activeId is NaN', () => {
      const { container } = render(
        <EmailCard
          email={mockEmail}
          selected={false}
          onSelect={mockOnSelect}
          activeId={NaN}
        />
      )

      const card = container.firstChild
      expect(card).not.toHaveClass('border-l-4')
      expect(card).not.toHaveClass('bg-blue-50')
    })

    it('should not apply active styling when activeId is zero (zero is not a valid email ID)', () => {
      const { container } = render(
        <EmailCard
          email={mockEmail}
          selected={false}
          onSelect={mockOnSelect}
          activeId={0}
        />
      )

      const card = container.firstChild
      // Zero is not a valid email ID (IDs start from 1)
      expect(card).not.toHaveClass('border-l-4')
      expect(card).not.toHaveClass('bg-blue-50')
    })
  })

  describe('Card Click Navigation', () => {
    const mockOnCardClick = vi.fn()

    beforeEach(() => {
      mockOnCardClick.mockClear()
    })

    it('should call onCardClick when card is clicked', () => {
      const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary' }
      render(
        <EmailCard
          email={emailWithSummary}
          selected={false}
          onSelect={mockOnSelect}
          onCardClick={mockOnCardClick}
        />
      )

      // Click on the card body
      fireEvent.click(screen.getByText('Test Subject'))

      expect(mockOnCardClick).toHaveBeenCalledWith(1)
    })

    it('should NOT call onCardClick when checkbox is clicked', () => {
      const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary' }
      render(
        <EmailCard
          email={emailWithSummary}
          selected={false}
          onSelect={mockOnSelect}
          onCardClick={mockOnCardClick}
        />
      )

      fireEvent.click(screen.getByRole('checkbox'))

      expect(mockOnCardClick).not.toHaveBeenCalled()
      expect(mockOnSelect).toHaveBeenCalledWith(1)
    })

    it('should NOT call onCardClick when onCardClick is undefined', () => {
      const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary' }
      render(
        <EmailCard
          email={emailWithSummary}
          selected={false}
          onSelect={mockOnSelect}
          onCardClick={undefined}
        />
      )

      fireEvent.click(screen.getByText('Test Subject'))

      // Should not throw error, expand/collapse should still work
      expect(screen.getByText('Test summary')).toBeInTheDocument()
    })
  })

  describe('Keyboard Accessibility', () => {
    const mockOnCardClick = vi.fn()

    beforeEach(() => {
      mockOnCardClick.mockClear()
    })

    it('should have role="button" when card is clickable (canExpand=true)', () => {
      const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary' }
      render(
        <EmailCard
          email={emailWithSummary}
          selected={false}
          onSelect={mockOnSelect}
          onCardClick={mockOnCardClick}
        />
      )

      const card = screen.getByTestId('email-card')
      expect(card).toHaveAttribute('role', 'button')
    })

    it('should have role="button" when onCardClick is provided (even if canExpand=false)', () => {
      const unprocessedEmail = { ...mockEmail, isProcessed: false, summary: null }
      render(
        <EmailCard
          email={unprocessedEmail}
          selected={false}
          onSelect={mockOnSelect}
          onCardClick={mockOnCardClick}
        />
      )

      const card = screen.getByTestId('email-card')
      expect(card).toHaveAttribute('role', 'button')
    })

    it('should NOT have role="button" when card is not interactive', () => {
      const unprocessedEmail = { ...mockEmail, isProcessed: false, summary: null }
      render(
        <EmailCard
          email={unprocessedEmail}
          selected={false}
          onSelect={mockOnSelect}
        />
      )

      const card = screen.getByTestId('email-card')
      expect(card).not.toHaveAttribute('role', 'button')
    })

    it('should have tabIndex={0} when card is clickable', () => {
      const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary' }
      render(
        <EmailCard
          email={emailWithSummary}
          selected={false}
          onSelect={mockOnSelect}
          onCardClick={mockOnCardClick}
        />
      )

      const card = screen.getByTestId('email-card')
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('should have tabIndex={0} when onCardClick is provided (even if canExpand=false)', () => {
      const unprocessedEmail = { ...mockEmail, isProcessed: false, summary: null }
      render(
        <EmailCard
          email={unprocessedEmail}
          selected={false}
          onSelect={mockOnSelect}
          onCardClick={mockOnCardClick}
        />
      )

      const card = screen.getByTestId('email-card')
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('should NOT have tabIndex={0} when card is not interactive', () => {
      const unprocessedEmail = { ...mockEmail, isProcessed: false, summary: null }
      render(
        <EmailCard
          email={unprocessedEmail}
          selected={false}
          onSelect={mockOnSelect}
        />
      )

      const card = screen.getByTestId('email-card')
      expect(card).not.toHaveAttribute('tabindex', '0')
    })

    it('should call onCardClick when Enter key is pressed on focused card', () => {
      const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary' }
      render(
        <EmailCard
          email={emailWithSummary}
          selected={false}
          onSelect={mockOnSelect}
          onCardClick={mockOnCardClick}
        />
      )

      const card = screen.getByTestId('email-card')
      fireEvent.keyDown(card, { key: 'Enter' })

      expect(mockOnCardClick).toHaveBeenCalledWith(1)
    })

    it('should call onCardClick when Space key is pressed on focused card', () => {
      const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary' }
      render(
        <EmailCard
          email={emailWithSummary}
          selected={false}
          onSelect={mockOnSelect}
          onCardClick={mockOnCardClick}
        />
      )

      const card = screen.getByTestId('email-card')
      fireEvent.keyDown(card, { key: ' ' })

      expect(mockOnCardClick).toHaveBeenCalledWith(1)
    })

    it('should toggle expansion when Enter is pressed and no onCardClick', () => {
      const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary' }
      render(
        <EmailCard
          email={emailWithSummary}
          selected={false}
          onSelect={mockOnSelect}
        />
      )

      const card = screen.getByTestId('email-card')
      fireEvent.keyDown(card, { key: 'Enter' })

      expect(screen.getByText('Test summary')).toBeInTheDocument()
    })

    it('should NOT call onCardClick when other keys are pressed', () => {
      const emailWithSummary = { ...mockEmail, isProcessed: true, summary: 'Test summary' }
      render(
        <EmailCard
          email={emailWithSummary}
          selected={false}
          onSelect={mockOnSelect}
          onCardClick={mockOnCardClick}
        />
      )

      const card = screen.getByTestId('email-card')
      fireEvent.keyDown(card, { key: 'Escape' })
      fireEvent.keyDown(card, { key: 'Tab' })

      expect(mockOnCardClick).not.toHaveBeenCalled()
    })
  })

  describe('Date Formatting', () => {
    it('shows "just now" for emails less than a minute old', () => {
      const nowEmail = { ...mockEmail, date: new Date() }
      render(<EmailCard email={nowEmail} selected={false} onSelect={mockOnSelect} />)

      expect(screen.getByText('just now')).toBeInTheDocument()
    })

    it('shows "X minutes ago" for emails under an hour old', () => {
      const minutesAgo = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
      const recentEmail = { ...mockEmail, date: minutesAgo }
      render(<EmailCard email={recentEmail} selected={false} onSelect={mockOnSelect} />)

      expect(screen.getByText('5 minutes ago')).toBeInTheDocument()
    })

    it('shows "1 minute ago" for singular minute', () => {
      const minuteAgo = new Date(Date.now() - 1 * 60 * 1000) // 1 minute ago
      const recentEmail = { ...mockEmail, date: minuteAgo }
      render(<EmailCard email={recentEmail} selected={false} onSelect={mockOnSelect} />)

      expect(screen.getByText('1 minute ago')).toBeInTheDocument()
    })

    it('shows "1 hour ago" for emails 1 hour old', () => {
      const hourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      const hourEmail = { ...mockEmail, date: hourAgo }
      render(<EmailCard email={hourEmail} selected={false} onSelect={mockOnSelect} />)

      expect(screen.getByText('1 hour ago')).toBeInTheDocument()
    })

    it('shows "X hours ago" for emails under a day old', () => {
      const hoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
      const hourEmail = { ...mockEmail, date: hoursAgo }
      render(<EmailCard email={hourEmail} selected={false} onSelect={mockOnSelect} />)

      expect(screen.getByText('5 hours ago')).toBeInTheDocument()
    })

    it('shows "yesterday" for emails 1 day old', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const yesterdayEmail = { ...mockEmail, date: yesterday }
      render(<EmailCard email={yesterdayEmail} selected={false} onSelect={mockOnSelect} />)

      expect(screen.getByText('yesterday')).toBeInTheDocument()
    })

    it('shows "X days ago" for emails under a week old', () => {
      const daysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      const daysEmail = { ...mockEmail, date: daysAgo }
      render(<EmailCard email={daysEmail} selected={false} onSelect={mockOnSelect} />)

      expect(screen.getByText('3 days ago')).toBeInTheDocument()
    })

    it('shows formatted date for emails older than a week', () => {
      const oldDate = new Date('2024-01-15')
      const oldEmail = { ...mockEmail, date: oldDate }
      render(<EmailCard email={oldEmail} selected={false} onSelect={mockOnSelect} />)

      // Should show locale date string
      expect(screen.getByText('1/15/2024')).toBeInTheDocument()
    })
  })
})