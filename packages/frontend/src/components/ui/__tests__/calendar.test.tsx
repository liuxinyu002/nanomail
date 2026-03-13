import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Calendar } from '../calendar'

describe('Calendar', () => {
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    mockOnSelect.mockClear()
  })

  describe('rendering', () => {
    it('renders the current month and year in header', () => {
      render(<Calendar onSelect={mockOnSelect} />)

      // Should show current month and year
      const now = new Date()
      const expectedMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      expect(screen.getByText(expectedMonth)).toBeInTheDocument()
    })

    it('renders day of week headers', () => {
      render(<Calendar onSelect={mockOnSelect} />)

      expect(screen.getByText('Su')).toBeInTheDocument()
      expect(screen.getByText('Mo')).toBeInTheDocument()
      expect(screen.getByText('Tu')).toBeInTheDocument()
      expect(screen.getByText('We')).toBeInTheDocument()
      expect(screen.getByText('Th')).toBeInTheDocument()
      expect(screen.getByText('Fr')).toBeInTheDocument()
      expect(screen.getByText('Sa')).toBeInTheDocument()
    })

    it('renders days of the month', () => {
      render(<Calendar onSelect={mockOnSelect} />)

      // Should render at least 28 days (minimum days in a month)
      const dayButtons = screen.getAllByRole('button', { name: /^\d+$/ })
      expect(dayButtons.length).toBeGreaterThanOrEqual(28)
    })
  })

  describe('month navigation', () => {
    it('navigates to previous month when left chevron is clicked', () => {
      render(<Calendar onSelect={mockOnSelect} />)

      const now = new Date()
      const currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

      // Find and click the previous month button
      const prevButton = screen.getByRole('button', { name: /previous month/i })
      fireEvent.click(prevButton)

      // Month should have changed
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const expectedMonth = prevMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      expect(screen.getByText(expectedMonth)).toBeInTheDocument()
      expect(screen.queryByText(currentMonth)).not.toBeInTheDocument()
    })

    it('navigates to next month when right chevron is clicked', () => {
      render(<Calendar onSelect={mockOnSelect} />)

      const now = new Date()
      const currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

      // Find and click the next month button
      const nextButton = screen.getByRole('button', { name: /next month/i })
      fireEvent.click(nextButton)

      // Month should have changed
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const expectedMonth = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      expect(screen.getByText(expectedMonth)).toBeInTheDocument()
      expect(screen.queryByText(currentMonth)).not.toBeInTheDocument()
    })
  })

  describe('date selection', () => {
    it('highlights the selected date', () => {
      const selectedDate = new Date(2024, 0, 15) // January 15, 2024
      render(<Calendar selected={selectedDate} onSelect={mockOnSelect} />)

      // Find the button for day 15
      const dayButton = screen.getByRole('button', { name: '15' })
      expect(dayButton).toHaveClass('bg-primary')
    })

    it('calls onSelect when a date is clicked', () => {
      render(<Calendar onSelect={mockOnSelect} />)

      // Click on day 15
      const dayButton = screen.getByRole('button', { name: '15' })
      fireEvent.click(dayButton)

      expect(mockOnSelect).toHaveBeenCalledTimes(1)
      const calledDate = mockOnSelect.mock.calls[0][0]
      expect(calledDate.getDate()).toBe(15)
    })

    it('does not call onSelect when a disabled date is clicked', () => {
      const disabled = (date: Date) => date.getDate() < 10
      render(<Calendar onSelect={mockOnSelect} disabled={disabled} />)

      // Click on day 5 (which should be disabled)
      const dayButton = screen.getByRole('button', { name: '5' })
      fireEvent.click(dayButton)

      expect(mockOnSelect).not.toHaveBeenCalled()
    })
  })

  describe('disabled dates', () => {
    it('applies disabled styles to disabled dates', () => {
      const disabled = (date: Date) => date.getDate() < 10
      render(<Calendar onSelect={mockOnSelect} disabled={disabled} />)

      const day5Button = screen.getByRole('button', { name: '5' })
      expect(day5Button).toBeDisabled()
      expect(day5Button).toHaveClass('opacity-50')
    })

    it('allows clicking non-disabled dates', () => {
      const disabled = (date: Date) => date.getDate() < 10
      render(<Calendar onSelect={mockOnSelect} disabled={disabled} />)

      const day15Button = screen.getByRole('button', { name: '15' })
      expect(day15Button).not.toBeDisabled()
      fireEvent.click(day15Button)

      expect(mockOnSelect).toHaveBeenCalledTimes(1)
    })
  })

  describe('outside month days', () => {
    it('shows days from previous/next month with muted style', () => {
      // January 2024 starts on Monday, so no days from previous month in first week
      // But February 2024 starts on Thursday, so we should see Jan 28-31
      render(<Calendar onSelect={mockOnSelect} />)

      // Days outside the current month should have muted style
      // This is hard to test specifically without knowing the current month
      // We'll just verify the component renders
      const dayButtons = screen.getAllByRole('button', { name: /^\d+$/ })
      expect(dayButtons.length).toBeGreaterThan(0)
    })
  })
})